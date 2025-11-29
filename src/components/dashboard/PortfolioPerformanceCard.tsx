import { Card } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const portfolioData = [
  { month: 'Aug', value: 780000 },
  { month: 'Sep', value: 795000 },
  { month: 'Oct', value: 810000 },
  { month: 'Nov', value: 825000 },
  { month: 'Dec', value: 820000 },
  { month: 'Jan', value: 842390 },
];

export function PortfolioPerformanceCard() {
  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Portfolio Performance
        </h3>
        <p className="text-xs text-gray-500">
          Last 6 months
        </p>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={portfolioData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
