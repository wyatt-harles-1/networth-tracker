import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useStatementImport } from '@/hooks/useStatementImport';
import { StatementPreviewTable } from './StatementPreviewTable';
import { ImportHistory } from './ImportHistory';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { FileProcessingService } from '@/services/fileProcessingService';

export function SmartStatementImporter() {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    currentImport,
    parsedTrades,
    loading,
    uploading,
    error,
    uploadAndParse,
  } = useStatementImport(currentImportId || undefined);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    const validation = await FileProcessingService.validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadProgress(10);

    const result = await uploadAndParse({
      filename: selectedFile.name,
      file_type:
        selectedFile.type ||
        FileProcessingService.getFileExtension(selectedFile.name),
      file_size: selectedFile.size,
      file: selectedFile,
    });

    setUploadProgress(50);

    if (result.success && result.importId) {
      setCurrentImportId(result.importId);
      setActiveTab('preview');
      setUploadProgress(100);
    } else {
      setUploadProgress(0);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const renderUploadArea = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Statement</CardTitle>
            <CardDescription>
              Upload your brokerage statement to automatically extract and
              import trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center transition-all bg-white
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${!selectedFile && !uploading ? 'cursor-pointer hover:border-blue-400 hover:bg-gray-50' : ''}
              `}
            >
              <input
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.csv,.xlsx,.xls,.txt,.eml"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading || !!selectedFile}
              />

              {!selectedFile && !uploading && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="w-16 h-16 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your statement here or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports PDF, CSV, XLSX, TXT, and EML files up to 10MB
                    </p>
                  </div>
                </div>
              )}

              {selectedFile && !uploading && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <FileText className="w-16 h-16 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {FileProcessingService.formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleUpload} size="lg">
                      Parse Statement
                    </Button>
                    <Button
                      onClick={handleClearFile}
                      variant="outline"
                      size="lg"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Processing Statement...
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      This may take a moment
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  File Types
                </h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• PDF statements</li>
                  <li>• CSV exports</li>
                  <li>• Excel spreadsheets</li>
                  <li>• Plain text files</li>
                  <li>• Email attachments</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Supported Brokers
                </h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Fidelity</li>
                  <li>• Robinhood</li>
                  <li>• E*TRADE</li>
                  <li>• Charles Schwab</li>
                  <li>• And more...</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPreview = () => {
    if (!currentImportId) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No statement uploaded yet
            </p>
          </CardContent>
        </Card>
      );
    }

    if (loading || currentImport?.status === 'processing') {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  Parsing Statement
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Extracting trade data...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentImport?.status === 'failed') {
      return (
        <Card>
          <CardContent className="py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {currentImport.error_message || 'Failed to parse statement'}
              </AlertDescription>
            </Alert>
            <div className="flex justify-center mt-6">
              <Button onClick={() => setActiveTab('upload')} variant="outline">
                Try Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentImport?.status === 'completed') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Parsed Trades</CardTitle>
                  <CardDescription>
                    {currentImport.broker_name &&
                      `Detected broker: ${currentImport.broker_name}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {currentImport.trade_count} trades found
                  </span>
                </div>
              </div>
            </CardHeader>
          </Card>

          <StatementPreviewTable
            importId={currentImportId}
            trades={parsedTrades}
            validationSummary={currentImport.validation_summary}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Smart Statement Importer
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload brokerage statements to automatically import trades
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            {renderUploadArea()}
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {renderPreview()}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ImportHistory
              onSelectImport={id => {
                setCurrentImportId(id);
                setActiveTab('preview');
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
