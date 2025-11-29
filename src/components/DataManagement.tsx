import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DataExportService } from '@/services/dataExportService';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Download,
  Upload,
  Loader2,
  FileJson,
  FileText,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DataManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Export options
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeHoldings, setIncludeHoldings] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeSnapshots, setIncludeSnapshots] = useState(false);
  const [includeLots, setIncludeLots] = useState(false);
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const result = await DataExportService.exportAndDownload(user.id, {
        format: exportFormat,
        includeTransactions,
        includeHoldings,
        includeAccounts,
        includeSnapshots,
        includeLots,
        dateRange: dateRangeEnabled
          ? { start: startDate, end: endDate }
          : undefined,
      });

      if (result.success) {
        toast({
          title: 'Export Successful',
          description: 'Your data has been downloaded',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Export Error',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const content = await file.text();
      const result = await DataExportService.importData(user.id, content);

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: `Imported ${result.imported?.transactions || 0} transactions, ${result.imported?.holdings || 0} holdings, ${result.imported?.accounts || 0} accounts`,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: result.error || 'Failed to import data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Error',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="p-4 pb-20">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Export and import your financial data
          </p>
        </div>

        {/* Export Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download your data for backup or portability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('json')}
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  JSON
                </Button>
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Data Selection */}
            <div className="space-y-2">
              <Label>Include in Export</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="transactions"
                    checked={includeTransactions}
                    onCheckedChange={checked =>
                      setIncludeTransactions(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="transactions"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Transactions
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="holdings"
                    checked={includeHoldings}
                    onCheckedChange={checked =>
                      setIncludeHoldings(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="holdings"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Holdings
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accounts"
                    checked={includeAccounts}
                    onCheckedChange={checked =>
                      setIncludeAccounts(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="accounts"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Accounts
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="snapshots"
                    checked={includeSnapshots}
                    onCheckedChange={checked =>
                      setIncludeSnapshots(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="snapshots"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Portfolio Snapshots
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lots"
                    checked={includeLots}
                    onCheckedChange={checked =>
                      setIncludeLots(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="lots"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tax Lots (FIFO tracking)
                  </label>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dateRange"
                  checked={dateRangeEnabled}
                  onCheckedChange={checked =>
                    setDateRangeEnabled(checked as boolean)
                  }
                />
                <label
                  htmlFor="dateRange"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                >
                  <Calendar className="h-3 w-3" />
                  Filter by Date Range
                </label>
              </div>
              {dateRangeEnabled && (
                <div className="grid grid-cols-2 gap-2 ml-6">
                  <div>
                    <Label htmlFor="startDate" className="text-xs">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Upload a previously exported JSON file to restore your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className={`cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {importing ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-600 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {importing ? 'Importing...' : 'Click to select file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JSON format only</p>
                </label>
              </div>
              <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                ⚠️ Importing data will merge with existing data. Duplicate
                transactions may be created.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
