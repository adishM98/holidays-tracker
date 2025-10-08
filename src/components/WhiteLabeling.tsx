import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, X, RotateCcw, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

export const WhiteLabeling: React.FC = () => {
  const { toast } = useToast();

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [logoMetadata, setLogoMetadata] = useState<any>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Favicon state
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
  const [selectedFaviconFile, setSelectedFaviconFile] = useState<File | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [deletingFavicon, setDeletingFavicon] = useState(false);
  const [faviconMetadata, setFaviconMetadata] = useState<any>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLogo();
    fetchFavicon();
  }, []);

  const fetchLogo = async () => {
    try {
      const response = await adminAPI.getLogoUrl();
      if (response.url) {
        setLogoUrl(response.url);
      }
    } catch (error: any) {
      console.error('Error fetching logo:', error);
    }
  };

  const fetchFavicon = async () => {
    try {
      const response = await adminAPI.getFaviconUrl();
      if (response.url) {
        setFaviconUrl(response.url);
      }
    } catch (error: any) {
      console.error('Error fetching favicon:', error);
    }
  };

  // Logo handlers
  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only PNG, JPG, and SVG files are allowed',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 1MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!selectedLogoFile) return;

    try {
      setUploadingLogo(true);
      const response = await adminAPI.uploadLogo(selectedLogoFile);

      setLogoUrl(response.url);
      setLogoMetadata(response.metadata);
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);

      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }

      toast({
        title: 'Logo Uploaded',
        description: 'Your company logo has been uploaded successfully',
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      setDeletingLogo(true);
      await adminAPI.deleteLogo();

      setLogoUrl(null);
      setLogoMetadata(null);
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);

      toast({
        title: 'Logo Deleted',
        description: 'Company logo has been removed',
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete logo',
        variant: 'destructive',
      });
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleLogoCancelPreview = () => {
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  // Favicon handlers
  const handleFaviconFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only ICO, PNG, and SVG files are allowed for favicon',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Favicon size must be less than 500KB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFaviconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFaviconPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = async () => {
    if (!selectedFaviconFile) return;

    try {
      setUploadingFavicon(true);
      const response = await adminAPI.uploadFavicon(selectedFaviconFile);

      setFaviconUrl(response.url);
      setFaviconMetadata(response.metadata);
      setSelectedFaviconFile(null);
      setFaviconPreviewUrl(null);

      if (faviconInputRef.current) {
        faviconInputRef.current.value = '';
      }

      toast({
        title: 'Favicon Uploaded',
        description: 'Your company favicon has been uploaded successfully',
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error uploading favicon:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload favicon',
        variant: 'destructive',
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleFaviconDelete = async () => {
    try {
      setDeletingFavicon(true);
      await adminAPI.deleteFavicon();

      setFaviconUrl(null);
      setFaviconMetadata(null);
      setSelectedFaviconFile(null);
      setFaviconPreviewUrl(null);

      toast({
        title: 'Favicon Deleted',
        description: 'Company favicon has been removed',
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error deleting favicon:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete favicon',
        variant: 'destructive',
      });
    } finally {
      setDeletingFavicon(false);
    }
  };

  const handleFaviconCancelPreview = () => {
    setSelectedFaviconFile(null);
    setFaviconPreviewUrl(null);
    if (faviconInputRef.current) {
      faviconInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Company Logo</span>
          </CardTitle>
          <CardDescription>
            Upload your company logo to display on login page and navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Logo Display */}
          {logoUrl && !logoPreviewUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Current Logo</h3>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border border-border min-h-[120px]">
                <img
                  src={`${API_BASE_URL}${logoUrl.split('?')[0]}`}
                  alt="Company Logo"
                  className="max-h-16 max-w-full object-contain"
                  onError={(e) => {
                    console.error('Logo failed to load');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              {logoMetadata && (
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-3 rounded">
                  <p><strong>Filename:</strong> {logoMetadata.filename}</p>
                  <p><strong>Size:</strong> {formatFileSize(logoMetadata.size)}</p>
                  <p><strong>Type:</strong> {logoMetadata.mimetype}</p>
                </div>
              )}
            </div>
          )}

          {/* Logo Preview */}
          {logoPreviewUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Preview</h3>
                <Badge variant="outline">Pending Upload</Badge>
              </div>
              <div className="flex items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500 border-dashed min-h-[120px]">
                <img
                  src={logoPreviewUrl}
                  alt="Preview"
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
              {selectedLogoFile && (
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-3 rounded">
                  <p><strong>Filename:</strong> {selectedLogoFile.name}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedLogoFile.size)}</p>
                  <p><strong>Type:</strong> {selectedLogoFile.type}</p>
                </div>
              )}
            </div>
          )}

          {/* Logo Upload Section */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoFileSelect}
                className="hidden"
                id="logo-upload"
              />

              {!logoPreviewUrl ? (
                <label htmlFor="logo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => logoInputRef.current?.click()}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                      <span>Choose Logo File</span>
                    </span>
                  </Button>
                </label>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <Button
                    onClick={handleLogoCancelPreview}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {logoUrl && !logoPreviewUrl && (
              <Button
                onClick={handleLogoDelete}
                disabled={deletingLogo}
                variant="outline"
                className="w-full border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {deletingLogo ? 'Removing...' : 'Remove Logo'}
              </Button>
            )}

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/10 p-3 rounded border border-border">
              <p className="font-medium">Logo Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Formats: PNG, JPG, SVG</li>
                <li>Max size: 1 MB</li>
                <li>Recommended: ≤ 60px height</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favicon Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Favicon</span>
          </CardTitle>
          <CardDescription>
            Upload a custom favicon to display in browser tabs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Favicon Display */}
          {faviconUrl && !faviconPreviewUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Current Favicon</h3>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border border-border min-h-[80px]">
                <img
                  src={`${API_BASE_URL}${faviconUrl.split('?')[0]}`}
                  alt="Favicon"
                  className="max-h-8 max-w-full object-contain"
                  onError={(e) => {
                    console.error('Favicon failed to load');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              {faviconMetadata && (
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-3 rounded">
                  <p><strong>Filename:</strong> {faviconMetadata.filename}</p>
                  <p><strong>Size:</strong> {formatFileSize(faviconMetadata.size)}</p>
                  <p><strong>Type:</strong> {faviconMetadata.mimetype}</p>
                </div>
              )}
            </div>
          )}

          {/* Favicon Preview */}
          {faviconPreviewUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Preview</h3>
                <Badge variant="outline">Pending Upload</Badge>
              </div>
              <div className="flex items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500 border-dashed min-h-[80px]">
                <img
                  src={faviconPreviewUrl}
                  alt="Preview"
                  className="max-h-8 max-w-full object-contain"
                />
              </div>
              {selectedFaviconFile && (
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-3 rounded">
                  <p><strong>Filename:</strong> {selectedFaviconFile.name}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedFaviconFile.size)}</p>
                  <p><strong>Type:</strong> {selectedFaviconFile.type}</p>
                </div>
              )}
            </div>
          )}

          {/* Favicon Upload Section */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <input
                ref={faviconInputRef}
                type="file"
                accept=".ico,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                onChange={handleFaviconFileSelect}
                className="hidden"
                id="favicon-upload"
              />

              {!faviconPreviewUrl ? (
                <label htmlFor="favicon-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => faviconInputRef.current?.click()}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                      <span>Choose Favicon File</span>
                    </span>
                  </Button>
                </label>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleFaviconUpload}
                    disabled={uploadingFavicon}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                  </Button>
                  <Button
                    onClick={handleFaviconCancelPreview}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {faviconUrl && !faviconPreviewUrl && (
              <Button
                onClick={handleFaviconDelete}
                disabled={deletingFavicon}
                variant="outline"
                className="w-full border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {deletingFavicon ? 'Removing...' : 'Remove Favicon'}
              </Button>
            )}

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/10 p-3 rounded border border-border">
              <p className="font-medium">Favicon Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Formats: ICO, PNG, SVG</li>
                <li>Max size: 500 KB</li>
                <li>Recommended: 32x32 or 16x16 pixels</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
