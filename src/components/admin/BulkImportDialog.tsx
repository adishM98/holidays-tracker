import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  summary: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: Array<{
      row: number;
      employeeId: string;
      email: string;
      errors: string[];
    }>;
  };
}

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'uploading' | 'results'>('select');
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size cannot exceed 2MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminAPI.downloadImportTemplate();
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: "CSV template has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setCurrentStep('uploading');
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await adminAPI.bulkImportEmployees(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setImportResult(result);
      setCurrentStep('results');
      
      if (result.success) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.summary.successfulImports} employees.`,
        });
        onSuccess();
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.summary.successfulImports} successful, ${result.summary.failedImports} failed.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import employees. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('select');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setImportResult(null);
    setCurrentStep('select');
    onClose();
  };

  const downloadErrorReport = () => {
    if (!importResult?.summary.errors.length) return;

    const csvContent = [
      ['Row', 'Employee ID', 'Email', 'Errors'],
      ...importResult.summary.errors.map(error => [
        error.row.toString(),
        error.employeeId,
        error.email,
        error.errors.join('; ')
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-errors.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Import Employees</span>
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'select' && (
          <div className="space-y-6">
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Import Instructions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">CSV File Requirements:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• File must be in CSV format (.csv)</li>
                      <li>• Maximum file size: 2MB</li>
                      <li>• Maximum 1,000 employees per import</li>
                      <li>• Include all required fields</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Required Fields:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Employee ID (unique)</li>
                      <li>• First Name</li>
                      <li>• Email (unique, valid format)</li>
                      <li>• Department (must exist)</li>
                      <li>• Joining Date (YYYY-MM-DD)</li>
                    </ul>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download CSV Template</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload CSV File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>
                
                {selectedFile && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Employees
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'uploading' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Processing Import</h3>
              <p className="text-muted-foreground">
                Uploading and validating your CSV file...
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <Progress value={uploadProgress} className="mb-2" />
              <p className="text-center text-sm text-muted-foreground">
                {uploadProgress.toFixed(0)}% complete
              </p>
            </div>
          </div>
        )}

        {currentStep === 'results' && importResult && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span>Import Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.summary.totalRows}
                    </div>
                    <div className="text-sm text-blue-700">Total Rows</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.summary.successfulImports}
                    </div>
                    <div className="text-sm text-green-700">Successful</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.summary.failedImports}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>

                <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                  <AlertDescription className={importResult.success ? "text-green-800" : "text-yellow-800"}>
                    {importResult.message}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Error Details */}
            {importResult.summary.errors.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Import Errors ({importResult.summary.errors.length})</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorReport}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Error Report
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Employee ID</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.summary.errors.map((error, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-3 py-2">{error.row}</td>
                            <td className="px-3 py-2 font-mono text-sm">{error.employeeId}</td>
                            <td className="px-3 py-2">{error.email}</td>
                            <td className="px-3 py-2">
                              <div className="space-y-1">
                                {error.errors.map((err, errIndex) => (
                                  <Badge key={errIndex} variant="destructive" className="text-xs">
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {importResult.summary.failedImports > 0 && (
                <Button
                  onClick={() => {
                    setCurrentStep('select');
                    setImportResult(null);
                    setSelectedFile(null);
                  }}
                >
                  Import Another File
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};