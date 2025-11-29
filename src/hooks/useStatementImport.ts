import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  StatementImport,
  ParsedTrade,
  ImportStatus,
  FileUploadMetadata,
} from '@/types/statementImport';
import { FileProcessingService } from '@/services/fileProcessingService';

export function useStatementImport(importId?: string) {
  const { user } = useAuth();
  const [imports, setImports] = useState<StatementImport[]>([]);
  const [currentImport, setCurrentImport] = useState<StatementImport | null>(
    null
  );
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !importId) {
      fetchImports();
    }
  }, [user, importId]);

  useEffect(() => {
    if (user && importId) {
      fetchImportDetails(importId);
      fetchParsedTrades(importId);
      subscribeToImportChanges(importId);
    }
  }, [user, importId]);

  const fetchImports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*')
        .eq('user_id', user!.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setImports(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch imports');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportDetails = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setCurrentImport(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch import details'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchParsedTrades = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('parsed_trades')
        .select('*')
        .eq('import_id', id)
        .eq('user_id', user!.id)
        .order('trade_date', { ascending: false });

      if (error) throw error;
      setParsedTrades(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch parsed trades'
      );
    }
  };

  const subscribeToImportChanges = (id: string) => {
    const channel = supabase
      .channel(`import-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'statement_imports',
          filter: `id=eq.${id}`,
        },
        payload => {
          if (payload.eventType === 'UPDATE') {
            setCurrentImport(payload.new as StatementImport);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parsed_trades',
          filter: `import_id=eq.${id}`,
        },
        () => {
          fetchParsedTrades(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const uploadAndParse = async (
    fileMetadata: FileUploadMetadata
  ): Promise<{ success: boolean; importId?: string; error?: string }> => {
    try {
      setUploading(true);
      setError(null);

      const uploadResult = await FileProcessingService.uploadToStorage(
        fileMetadata.file,
        user!.id
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      const { data: importRecord, error: insertError } = await supabase
        .from('statement_imports')
        .insert({
          user_id: user!.id,
          filename: fileMetadata.filename,
          file_type: fileMetadata.file_type,
          file_path: uploadResult.path!,
          file_size: fileMetadata.file_size,
          status: ImportStatus.PENDING,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const parseResult = await triggerParsing(importRecord.id);

      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }

      return { success: true, importId: importRecord.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  };

  const triggerParsing = async (
    importId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/parse-statement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ importId }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Parsing failed');
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Parsing failed',
      };
    }
  };

  const updateTrade = async (
    tradeId: string,
    updates: Partial<ParsedTrade>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('parsed_trades')
        .update(updates)
        .eq('id', tradeId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setParsedTrades(prev =>
        prev.map(trade =>
          trade.id === tradeId ? { ...trade, ...updates } : trade
        )
      );

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Update failed',
      };
    }
  };

  const deleteTrade = async (
    tradeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('parsed_trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setParsedTrades(prev => prev.filter(trade => trade.id !== tradeId));

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Delete failed',
      };
    }
  };

  const toggleTradeSelection = async (
    tradeId: string,
    selected: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    return updateTrade(tradeId, { is_selected: selected });
  };

  const deleteImport = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('statement_imports')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      setImports(prev => prev.filter(imp => imp.id !== id));

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Delete failed',
      };
    }
  };

  return {
    imports,
    currentImport,
    parsedTrades,
    loading,
    uploading,
    error,
    uploadAndParse,
    updateTrade,
    deleteTrade,
    toggleTradeSelection,
    deleteImport,
    refetchImports: fetchImports,
    refetchParsedTrades: importId
      ? () => fetchParsedTrades(importId)
      : undefined,
  };
}
