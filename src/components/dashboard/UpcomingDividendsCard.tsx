import { useState } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDividends } from '@/hooks/useDividends';
import { formatCurrency } from '@/lib/utils';

export function UpcomingDividendsCard() {
  const { getUpcomingDividends, loading } = useDividends();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMonthYearSelectorOpen, setIsMonthYearSelectorOpen] = useState(false);

  const upcomingDividends = getUpcomingDividends(90).map(d => ({
    stock: d.symbol,
    date: new Date(d.pay_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    amount: formatCurrency(d.amount),
    numericAmount: d.amount,
    fullDate: d.pay_date,
  }));

  // Calculate monthly projection for current popup month
  const calculateMonthlyProjection = () => {
    const { year, month } = currentMonthData;
    return upcomingDividends
      .filter(d => {
        const payDate = new Date(d.fullDate);
        return payDate.getFullYear() === year && payDate.getMonth() === month;
      })
      .reduce((sum, d) => sum + d.numericAmount, 0);
  };

  const getDividendsForDate = (dateStr: string) => {
    return upcomingDividends.filter(div => div.fullDate === dateStr);
  };

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </Card>
    );
  }

  const generateCalendarDays = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + currentMonthOffset;
    const currentYear = today.getFullYear();

    // Adjust year if month goes beyond current year boundaries
    const adjustedYear = currentYear + Math.floor(currentMonth / 12);
    const adjustedMonth = ((currentMonth % 12) + 12) % 12;

    const firstDay = new Date(adjustedYear, adjustedMonth, 1);
    const daysInMonth = new Date(adjustedYear, adjustedMonth + 1, 0).getDate();
    const startDay = firstDay.getDay();

    return {
      name: new Date(adjustedYear, adjustedMonth).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      days: daysInMonth,
      startDay: startDay,
      year: adjustedYear,
      month: adjustedMonth,
    };
  };

  const formatDateForComparison = (
    year: number,
    month: number,
    day: number
  ) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const currentMonthData = generateCalendarDays();
  const today = new Date();
  const monthlyProjection = isPopupOpen ? calculateMonthlyProjection() : 0;

  const goToPreviousMonth = () => {
    setCurrentMonthOffset(prev => prev - 1);
  };

  const goToNextMonth = () => {
    setCurrentMonthOffset(prev => prev + 1);
  };

  const selectMonthYear = (monthOffset: number) => {
    setCurrentMonthOffset(monthOffset);
    setIsMonthYearSelectorOpen(false);
  };

  const generateMonthYearOptions = () => {
    const options = [];
    const currentDate = new Date();

    // Generate options for 2 years back to 2 years forward
    for (let yearOffset = -2; yearOffset <= 2; yearOffset++) {
      const year = currentDate.getFullYear() + yearOffset;
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month);
        const monthOffset =
          (year - currentDate.getFullYear()) * 12 +
          (month - currentDate.getMonth());
        options.push({
          label: date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          }),
          offset: monthOffset,
          year,
          month,
        });
      }
    }

    return options;
  };

  return (
    <>
      <Card
        className="p-4 bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsPopupOpen(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Upcoming Dividends
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Next 30 days: {formatCurrency(upcomingDividends.slice(0, 10).reduce((sum, d) => sum + d.numericAmount, 0))}
            </p>
          </div>
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="space-y-2">
          {upcomingDividends.slice(0, 3).map((dividend, index) => {
            // Color-code by amount (larger = darker blue)
            const isLargeAmount = dividend.numericAmount >= 50;
            const isMediumAmount = dividend.numericAmount >= 20 && dividend.numericAmount < 50;

            return (
              <div
                key={index}
                className="flex items-center justify-between py-1.5"
              >
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {dividend.stock}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dividend.date}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    isLargeAmount
                      ? 'text-blue-700'
                      : isMediumAmount
                        ? 'text-blue-600'
                        : 'text-blue-500'
                  }`}
                >
                  {dividend.amount}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Popup Modal */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Dividend Calendar
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentMonthData.name} • {formatCurrency(monthlyProjection)} projected
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPopupOpen(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setIsMonthYearSelectorOpen(true)}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
              >
                {currentMonthData.name}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center py-2">
                  <span className="text-xs font-medium text-gray-500">
                    {day}
                  </span>
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: currentMonthData.startDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}

              {/* Calendar Days */}
              {Array.from({ length: currentMonthData.days }, (_, i) => {
                const day = i + 1;
                const dateStr = formatDateForComparison(
                  currentMonthData.year,
                  currentMonthData.month,
                  day
                );
                const dividendsForDay = getDividendsForDate(dateStr);
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === currentMonthData.month &&
                  today.getFullYear() === currentMonthData.year;
                const hasDividends = dividendsForDay.length > 0;
                const isSelected = selectedDate === dateStr;

                return (
                  <div key={day} className="relative">
                    <div
                      className={`
                        h-10 w-full flex items-center justify-center text-sm rounded-lg transition-colors cursor-pointer
                        ${
                          isToday
                            ? 'bg-blue-600 text-white font-semibold'
                            : isSelected
                              ? 'bg-gray-200 text-gray-900 font-medium'
                              : hasDividends
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      {day}
                    </div>
                    {hasDividends && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full border border-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dividend List */}
            <div className="pt-4 border-t border-gray-200">
              {selectedDate ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Dividends for{' '}
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h4>
                  <div className="space-y-2">
                    {getDividendsForDate(selectedDate).length > 0 ? (
                      getDividendsForDate(selectedDate).map(
                        (dividend, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {dividend.stock}
                              </p>
                              <p className="text-xs text-gray-500">
                                Dividend Payment
                              </p>
                            </div>
                            <span className="text-sm font-medium text-blue-600">
                              {dividend.amount}
                            </span>
                          </div>
                        )
                      )
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-sm text-gray-500">
                          No dividends scheduled for this date
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="mt-3 w-full"
                  >
                    View All Upcoming Dividends
                  </Button>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Upcoming Dividends
                  </h4>
                  <div className="space-y-2">
                    {upcomingDividends.map((dividend, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {dividend.stock}
                          </p>
                          <p className="text-xs text-gray-500">
                            {dividend.date}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-blue-600">
                          {dividend.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Month/Year Selector Modal */}
      {isMonthYearSelectorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Month & Year
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMonthYearSelectorOpen(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {generateMonthYearOptions().map(option => (
                <button
                  key={option.offset}
                  onClick={() => selectMonthYear(option.offset)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    option.offset === currentMonthOffset
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
