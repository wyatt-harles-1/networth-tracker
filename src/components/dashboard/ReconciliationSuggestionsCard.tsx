import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReconciliationSuggestionsService,
  ReconciliationSuggestion,
} from '@/services/reconciliationSuggestionsService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Loader2,
  X,
  Wrench,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ReconciliationSuggestionsCard() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [showAllGood, setShowAllGood] = useState(true);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const { toast } = useToast();

  const loadSuggestions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await ReconciliationSuggestionsService.generateSuggestions(
        user.id
      );
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    // Auto-dismiss "All Good" card after 3 seconds if no issues
    if (!loading && suggestions.length === 0) {
      // Start collapsing after 3 seconds
      const collapseTimer = setTimeout(() => {
        setIsCollapsing(true);
      }, 3000);

      // Remove from DOM after collapse animation completes
      const removeTimer = setTimeout(() => {
        setShowAllGood(false);
      }, 3700); // 3s wait + 700ms collapse

      return () => {
        clearTimeout(collapseTimer);
        clearTimeout(removeTimer);
      };
    } else {
      // Reset visibility if issues are detected
      setShowAllGood(true);
      setIsCollapsing(false);
    }
  }, [loading, suggestions.length]);

  const handleApplyFix = async (suggestion: ReconciliationSuggestion) => {
    setFixingId(suggestion.id);
    try {
      const result =
        await ReconciliationSuggestionsService.applyAutoFix(suggestion);

      if (result.success) {
        toast({
          title: 'Issue Resolved',
          description: 'The issue has been automatically fixed',
        });

        // Reload suggestions
        await loadSuggestions();
      } else {
        toast({
          title: 'Auto-Fix Failed',
          description: result.error || 'Could not fix the issue automatically',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while trying to fix the issue',
        variant: 'destructive',
      });
    } finally {
      setFixingId(null);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    ReconciliationSuggestionsService.dismissSuggestion(suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getSeverityIcon = (severity: ReconciliationSuggestion['severity']) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: ReconciliationSuggestion['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    if (!showAllGood) {
      return null;
    }

    return (
      <div
        className={`transition-all duration-700 ease-in-out overflow-hidden ${
          isCollapsing ? 'max-h-0 opacity-0 mb-0' : 'max-h-32 opacity-100 mb-4'
        }`}
      >
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">All Good!</h3>
          </div>
          <p className="text-sm text-gray-600">
            No data issues detected. Your accounts are in sync.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Data Health</h3>
        <span className="text-xs text-gray-500">
          {suggestions.length} {suggestions.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.slice(0, 3).map(suggestion => (
          <div
            key={suggestion.id}
            className={`p-3 rounded-lg border ${getSeverityColor(suggestion.severity)}`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {getSeverityIcon(suggestion.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-0.5">
                  {suggestion.title}
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  {suggestion.description}
                </p>
                <p className="text-xs text-gray-500 italic">
                  {suggestion.suggestedAction}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {suggestion.autoFixAvailable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => handleApplyFix(suggestion)}
                    disabled={fixingId === suggestion.id}
                  >
                    {fixingId === suggestion.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wrench className="h-3 w-3" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => handleDismiss(suggestion.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={loadSuggestions}
        >
          View all {suggestions.length} suggestions
        </Button>
      )}
    </Card>
  );
}
