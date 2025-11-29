import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Wallet,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DataAuditService,
  AccountBalanceAudit,
} from '@/services/dataAuditService';
import { formatCurrency } from '@/lib/utils';

interface AccountReconciliationProps {
  accountId?: string;
  onReconciled?: () => void;
}

export function AccountReconciliation({
  accountId,
  onReconciled,
}: AccountReconciliationProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AccountBalanceAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async () => {
    if (!user || !accountId) return;

    setAuditing(true);
    setError(null);

    const result = await DataAuditService.auditAccountBalances(user.id);

    if (result.error) {
      setError(result.error);
      setAuditing(false);
      return;
    }

    if (result.data) {
      const accountAudit = result.data.accountAudits.find(
        a => a.accountId === accountId
      );
      setAudit(accountAudit || null);
    }

    setAuditing(false);
  };

  const handleRecalculate = async () => {
    if (!user || !accountId) return;

    setLoading(true);
    setError(null);

    const result = await DataAuditService.recalculateAccountBalance(
      user.id,
      accountId
    );

    if (result.error) {
      setError(result.error);
    } else {
      await handleAudit();
      if (onReconciled) {
        onReconciled();
      }
    }

    setLoading(false);
  };

  if (!accountId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white border-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Balance Reconciliation
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAudit}
            disabled={auditing}
          >
            {auditing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Check Balance
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {audit && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">
                    Current Balance
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(audit.currentBalance)}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">
                    Calculated Balance
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(audit.calculatedBalance)}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">
                    Holdings Value
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(audit.holdingsValue)}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">
                    Total Value
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(audit.totalValue)}
                </p>
              </div>
            </div>

            {audit.hasDiscrepancy ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800 mb-1">
                      Balance Mismatch Detected
                    </p>
                    <p className="text-xs text-orange-700 mb-2">
                      Your account balance differs from the calculated total by{' '}
                      <strong>
                        {formatCurrency(Math.abs(audit.difference))}
                      </strong>
                      . This usually happens when transactions are edited or
                      deleted.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleRecalculate}
                      disabled={loading}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Recalculating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Fix Balance
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">
                  Balance is accurate ({audit.transactionCount} transactions)
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
