import {
  FileText,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useStatementImport } from '@/hooks/useStatementImport';
import { ImportStatus } from '@/types/statementImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/components/ui/badge-variants';
import { type VariantProps } from 'class-variance-authority';
import { FileProcessingService } from '@/services/fileProcessingService';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface ImportHistoryProps {
  onSelectImport: (importId: string) => void;
}

export function ImportHistory({ onSelectImport }: ImportHistoryProps) {
  const { imports, loading, deleteImport } = useStatementImport();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const result = await deleteImport(id);
    if (result.success) {
      toast.success('Import deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete import');
    }
    setDeleteConfirmId(null);
  };

  const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
      case ImportStatus.COMPLETED:
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case ImportStatus.PROCESSING:
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case ImportStatus.FAILED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case ImportStatus.PENDING:
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusBadge = (status: ImportStatus) => {
    const variants: Record<
      ImportStatus,
      VariantProps<typeof badgeVariants>['variant']
    > = {
      [ImportStatus.COMPLETED]: 'default',
      [ImportStatus.PROCESSING]: 'secondary',
      [ImportStatus.FAILED]: 'destructive',
      [ImportStatus.PENDING]: 'outline',
    };

    return (
      <Badge
        variant={variants[status]}
        className="flex items-center gap-1 w-fit"
      >
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getStatusColor = (status: ImportStatus) => {
    switch (status) {
      case ImportStatus.COMPLETED:
        return 'border-green-200 bg-green-50';
      case ImportStatus.PROCESSING:
        return 'border-blue-200 bg-blue-50';
      case ImportStatus.FAILED:
        return 'border-red-200 bg-red-50';
      case ImportStatus.PENDING:
        return 'border-orange-200 bg-orange-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">Loading import history...</p>
        </CardContent>
      </Card>
    );
  }

  if (imports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No imports yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Upload your first statement to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {imports.map(importRecord => (
        <Card
          key={importRecord.id}
          className={`transition-all hover:shadow-md ${getStatusColor(importRecord.status)}`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    <FileText className="w-6 h-6 text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {importRecord.filename}
                      </h3>
                      {getStatusBadge(importRecord.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(
                          new Date(importRecord.uploaded_at),
                          'MMM d, yyyy h:mm a'
                        )}
                      </div>
                      {importRecord.broker_name && (
                        <Badge variant="outline" className="text-xs">
                          {importRecord.broker_name}
                        </Badge>
                      )}
                      <span className="text-xs">
                        {FileProcessingService.formatFileSize(
                          importRecord.file_size
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {importRecord.status === ImportStatus.COMPLETED && (
                  <div className="flex items-center gap-6 text-sm ml-14">
                    <div>
                      <span className="text-gray-600">Trades Found: </span>
                      <span className="font-medium text-gray-900">
                        {importRecord.trade_count}
                      </span>
                    </div>
                    {importRecord.validation_summary && (
                      <>
                        <div>
                          <span className="text-green-600">
                            {importRecord.validation_summary.validCount} Valid
                          </span>
                        </div>
                        {importRecord.validation_summary.warningCount > 0 && (
                          <div>
                            <span className="text-orange-600">
                              {importRecord.validation_summary.warningCount}{' '}
                              Warnings
                            </span>
                          </div>
                        )}
                        {importRecord.validation_summary.errorCount > 0 && (
                          <div>
                            <span className="text-red-600">
                              {importRecord.validation_summary.errorCount}{' '}
                              Errors
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {importRecord.status === ImportStatus.FAILED &&
                  importRecord.error_message && (
                    <div className="ml-14 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-red-800">
                        {importRecord.error_message}
                      </p>
                    </div>
                  )}
              </div>

              <div className="flex gap-2 ml-4">
                {importRecord.status === ImportStatus.COMPLETED && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectImport(importRecord.id)}
                  >
                    View Details
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmId(importRecord.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={open => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this import? This will remove all
              parsed trades associated with it. Any trades already imported to
              your portfolio will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
