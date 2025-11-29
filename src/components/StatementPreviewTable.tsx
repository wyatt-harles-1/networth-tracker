import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  ParsedTrade,
  ValidationSummary,
  ValidationStatus,
} from '@/types/statementImport';
import { useStatementImport } from '@/hooks/useStatementImport';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/components/ui/badge-variants';
import { type VariantProps } from 'class-variance-authority';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CSVExportService } from '@/services/csvExportService';
import { StatementImportTriggers } from '@/services/statementImportTriggers';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StatementPreviewTableProps {
  importId: string;
  trades: ParsedTrade[];
  validationSummary: ValidationSummary;
}

export function StatementPreviewTable({
  importId,
  trades,
  validationSummary,
}: StatementPreviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | ValidationStatus>('all');
  const [editingTrade, setEditingTrade] = useState<ParsedTrade | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { user } = useAuth();
  const { updateTrade, deleteTrade, toggleTradeSelection } =
    useStatementImport(importId);
  const { addTransaction } = useTransactions();

  const toggleRow = (tradeId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return next;
    });
  };

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true;
    return trade.validation_status === filter;
  });

  const selectedTrades = trades.filter(t => t.is_selected);

  const handleExportCSV = () => {
    const csv = CSVExportService.exportTradesToCSV(trades, {
      includeHeaders: true,
      includeValidationStatus: true,
      includeConfidenceScore: true,
      includeRawText: false,
    });

    const filename = CSVExportService.generateFilename(
      null,
      new Date().toISOString().split('T')[0]
    );
    CSVExportService.downloadCSV(csv, filename);
    toast.success('CSV exported successfully');
  };

  const handleToggleSelection = async (tradeId: string, checked: boolean) => {
    const result = await toggleTradeSelection(tradeId, checked);
    if (!result.success) {
      toast.error(result.error || 'Failed to update selection');
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    const result = await deleteTrade(tradeId);
    if (result.success) {
      toast.success('Trade deleted');
    } else {
      toast.error(result.error || 'Failed to delete trade');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTrade) return;

    const result = await updateTrade(editingTrade.id, {
      symbol: editingTrade.symbol,
      action: editingTrade.action,
      shares: editingTrade.shares,
      price: editingTrade.price,
      amount: editingTrade.amount,
      trade_date: editingTrade.trade_date,
      account_name: editingTrade.account_name,
    });

    if (result.success) {
      toast.success('Trade updated');
      setEditingTrade(null);
    } else {
      toast.error(result.error || 'Failed to update trade');
    }
  };

  const handleImportSelected = async () => {
    const tradesToImport = selectedTrades.filter(
      t => t.validation_status !== ValidationStatus.ERROR
    );

    if (tradesToImport.length === 0) {
      toast.error('No valid trades selected');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const trade of tradesToImport) {
      const result = await addTransaction({
        transaction_date: trade.trade_date,
        description:
          `${trade.action} ${trade.shares || ''} ${trade.symbol}`.trim(),
        amount: trade.amount,
        transaction_type: mapActionToTransactionType(trade.action),
        category: mapActionToCategory(trade.action),
        account_id: null,
        data_source: 'statement_import',
        external_transaction_id: trade.id,
        is_reviewed: false,
        transaction_metadata: {
          ticker: trade.symbol,
          quantity: trade.shares || undefined,
          price: trade.price || undefined,
          import_id: importId,
        },
      });

      if (result.error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Imported ${successCount} trades successfully`);

      if (user) {
        const triggerResult = await StatementImportTriggers.onTradesImported(
          user.id,
          importId,
          tradesToImport.map(t => t.id)
        );

        if (triggerResult.success) {
          toast.info('Calculating portfolio values in the background...');
        }
      }
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} trades`);
    }

    setShowImportDialog(false);
  };

  const mapActionToTransactionType = (action: string): string => {
    const map: Record<string, string> = {
      BUY: 'stock_buy',
      SELL: 'stock_sell',
      DIVIDEND: 'stock_dividend',
      INTEREST: 'interest',
      DEPOSIT: 'deposit',
      WITHDRAWAL: 'withdrawal',
      FEE: 'fee',
    };
    return map[action] || 'other';
  };

  const mapActionToCategory = (action: string): string | null => {
    if (['BUY', 'SELL', 'DIVIDEND'].includes(action)) return 'stock';
    return null;
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case ValidationStatus.VALID:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case ValidationStatus.WARNING:
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case ValidationStatus.ERROR:
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ValidationStatus) => {
    const variants: Record<
      ValidationStatus,
      VariantProps<typeof badgeVariants>['variant']
    > = {
      [ValidationStatus.VALID]: 'default',
      [ValidationStatus.WARNING]: 'secondary',
      [ValidationStatus.ERROR]: 'destructive',
      [ValidationStatus.PENDING]: 'outline',
    };

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Validation Summary</CardTitle>
          <CardDescription>
            Review the quality of parsed trade data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {validationSummary.totalTrades}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Trades</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {validationSummary.validCount}
              </p>
              <p className="text-sm text-gray-600 mt-1">Valid</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {validationSummary.warningCount}
              </p>
              <p className="text-sm text-gray-600 mt-1">Warnings</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {validationSummary.errorCount}
              </p>
              <p className="text-sm text-gray-600 mt-1">Errors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parsed Trades</CardTitle>
              <CardDescription>
                {selectedTrades.length} of {trades.length} trades selected for
                import
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                disabled={selectedTrades.length === 0}
                size="sm"
              >
                Import Selected ({selectedTrades.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={
                filter === ValidationStatus.VALID ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => setFilter(ValidationStatus.VALID)}
            >
              Valid
            </Button>
            <Button
              variant={
                filter === ValidationStatus.WARNING ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => setFilter(ValidationStatus.WARNING)}
            >
              Warnings
            </Button>
            <Button
              variant={
                filter === ValidationStatus.ERROR ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => setFilter(ValidationStatus.ERROR)}
            >
              Errors
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map(trade => (
                  <>
                    <TableRow key={trade.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(trade.id)}
                          className="p-0 h-8 w-8"
                        >
                          {expandedRows.has(trade.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={trade.is_selected}
                          onCheckedChange={checked =>
                            handleToggleSelection(trade.id, checked as boolean)
                          }
                          disabled={
                            trade.validation_status === ValidationStatus.ERROR
                          }
                        />
                      </TableCell>
                      <TableCell>{trade.trade_date}</TableCell>
                      <TableCell className="font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>{trade.action}</TableCell>
                      <TableCell className="text-right">
                        {trade.shares || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.price ? `$${trade.price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Math.abs(trade.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(trade.validation_status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-8 w-8"
                            onClick={() => setEditingTrade(trade)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteTrade(trade.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(trade.id) && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-gray-50">
                          <div className="p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">
                                Confidence:
                              </span>
                              <span className="text-gray-600">
                                {(trade.confidence_score * 100).toFixed(0)}%
                              </span>
                            </div>
                            {trade.raw_text_snippet && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Raw Text:
                                </span>
                                <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                                  {trade.raw_text_snippet}
                                </pre>
                              </div>
                            )}
                            {trade.validation_errors &&
                              trade.validation_errors.length > 0 && (
                                <div className="space-y-1">
                                  {trade.validation_errors.map((error, idx) => (
                                    <Alert
                                      key={idx}
                                      variant={
                                        error.severity === 'error'
                                          ? 'destructive'
                                          : 'default'
                                      }
                                      className="py-2"
                                    >
                                      <AlertDescription className="text-sm">
                                        <strong>{error.field}:</strong>{' '}
                                        {error.message}
                                        {error.suggestedFix && (
                                          <span className="block mt-1 text-xs opacity-75">
                                            Suggestion: {error.suggestedFix}
                                          </span>
                                        )}
                                      </AlertDescription>
                                    </Alert>
                                  ))}
                                </div>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingTrade}
        onOpenChange={open => !open && setEditingTrade(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trade</DialogTitle>
            <DialogDescription>
              Make corrections to the parsed trade data
            </DialogDescription>
          </DialogHeader>
          {editingTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Symbol</Label>
                  <Input
                    value={editingTrade.symbol}
                    onChange={e =>
                      setEditingTrade({
                        ...editingTrade,
                        symbol: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editingTrade.trade_date}
                    onChange={e =>
                      setEditingTrade({
                        ...editingTrade,
                        trade_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Shares</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTrade.shares || ''}
                    onChange={e =>
                      setEditingTrade({
                        ...editingTrade,
                        shares: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTrade.price || ''}
                    onChange={e =>
                      setEditingTrade({
                        ...editingTrade,
                        price: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTrade.amount}
                    onChange={e =>
                      setEditingTrade({
                        ...editingTrade,
                        amount: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrade(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              You are about to import {selectedTrades.length} trades into your
              portfolio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              This will create new transactions for each selected trade. You can
              review and edit them later in the Transactions page.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleImportSelected}>Import Trades</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
