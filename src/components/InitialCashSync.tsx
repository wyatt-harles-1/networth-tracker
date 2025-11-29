import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { CashSyncService } from '@/services/cashSyncService';
import { useAuth } from '@/contexts/AuthContext';

export function InitialCashSync() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSync = async () => {
    if (!user) return;

    setSyncing(true);
    setSyncStatus('idle');
    setErrorMessage(null);

    const result = await CashSyncService.syncAllCashAccounts(user.id);

    setSyncing(false);

    if (result.success) {
      setSyncStatus('success');
    } else {
      setSyncStatus('error');
      setErrorMessage(result.error);
    }
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Initialize Cash Holdings
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        This will sync all your cash account balances as holdings. This is a
        one-time setup step that ensures your portfolio accurately reflects both
        your investments and cash positions.
      </p>

      {syncStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">
            Cash holdings synced successfully!
          </p>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Sync failed
            </p>
            {errorMessage && (
              <p className="text-xs text-red-700 mt-1">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      <Button onClick={handleSync} disabled={syncing} className="w-full">
        {syncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          'Sync Cash Holdings'
        )}
      </Button>
    </Card>
  );
}
