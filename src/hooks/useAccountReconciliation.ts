import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DataAuditService,
  AccountBalanceAudit,
} from '@/services/dataAuditService';

export function useAccountReconciliation(accountId?: string) {
  const { user } = useAuth();
  const [audit, setAudit] = useState<AccountBalanceAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && accountId) {
      fetchAudit();
    }
  }, [user, accountId]);

  const fetchAudit = async () => {
    if (!user || !accountId) return;

    setLoading(true);
    setError(null);

    const result = await DataAuditService.auditAccountBalances(user.id);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      const accountAudit = result.data.accountAudits.find(
        a => a.accountId === accountId
      );
      setAudit(accountAudit || null);
    }

    setLoading(false);
  };

  const recalculate = async () => {
    if (!user || !accountId)
      return { success: false, error: 'Missing user or account' };

    setLoading(true);
    setError(null);

    const result = await DataAuditService.recalculateAccountBalance(
      user.id,
      accountId
    );

    if (result.error) {
      setError(result.error);
    } else {
      await fetchAudit();
    }

    setLoading(false);
    return result;
  };

  return {
    audit,
    loading,
    error,
    refetch: fetchAudit,
    recalculate,
  };
}
