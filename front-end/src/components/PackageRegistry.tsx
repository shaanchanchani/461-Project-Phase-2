import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Search, Upload, Download, RefreshCw, Star, HardDrive, RotateCcw } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface PackageData {
  metadata: {
    Name: string;
    Version: string;
    ID: string;
  };
  data: {
    Content?: string;
    URL?: string;
    JSProgram?: string;
    debloat?: boolean;
  };
}

interface UploadFormData {
  url: string;
  file: File | null;
  uploadType: 'url' | 'file';
  JSProgram: string;
  debloat: boolean;
}

const PackageRegistry: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    url: '',
    file: null,
    uploadType: 'url',
    JSProgram: '',
    debloat: false
  });
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [hasBrowsed, setHasBrowsed] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/packages', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ Name: "*" }])  // Query to get all packages
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch packages');
      }

      const data = await response.json();
      // Transform the response to match our PackageData interface
      const transformedData = data.map((pkg: any) => ({
        metadata: {
          Name: pkg.Name || pkg.metadata?.Name,
          Version: pkg.Version || pkg.metadata?.Version,
          ID: pkg.ID || pkg.metadata?.ID
        },
        data: {
          URL: pkg.URL || pkg.data?.URL,
          Content: pkg.Content || pkg.data?.Content,
          JSProgram: pkg.JSProgram || pkg.data?.JSProgram,
          debloat: pkg.debloat || pkg.data?.debloat
        }
      }));
      setPackages(transformedData);
      setHasBrowsed(true); // Set hasBrowsed after successfully getting packages
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFormData(prev => ({ ...prev, file }));
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      // Use the same patterns as the backend
      const githubPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+)?\/?$/;
      const npmPattern = /^(?:https?:\/\/)?(?:www\.)?npmjs\.com\/package\/(@[^\/]+\/[^\/]+|[^\/]+)(?:\/v\/([^\/]+))?\/?$/;

      console.log('Validating URL:', url);
      console.log('GitHub pattern test:', githubPattern.test(url));
      console.log('npm pattern test:', npmPattern.test(url));

      return githubPattern.test(url) || npmPattern.test(url);
    } catch (error) {
      console.error('URL validation error:', error);
      return false;
    }
  };

  const validateFile = (file: File): boolean => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 50MB limit');
    }
    if (!file.name.endsWith('.zip')) {
      throw new Error('File must be a ZIP archive');
    }
    return true;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadStatus(null);
    setLoading(true);
    setHasBrowsed(false); // Reset browse state after upload

    try {
      // Validate URL if upload type is URL
      if (uploadFormData.uploadType === 'url') {
        if (!uploadFormData.url) {
          setUploadStatus({
            success: false,
            message: 'Please enter a URL'
          });
          return;
        }
        
        if (!validateUrl(uploadFormData.url)) {
          setUploadStatus({
            success: false,
            message: 'Please enter a valid GitHub or npm package URL'
          });
          return;
        }
      }

      // Validate file if upload type is file
      if (uploadFormData.uploadType === 'file') {
        if (!uploadFormData.file) {
          setUploadStatus({
            success: false,
            message: 'Please select a file to upload'
          });
          return;
        }
        if (!uploadFormData.file.name.endsWith('.zip')) {
          setUploadStatus({
            success: false,
            message: 'File must be a ZIP archive'
          });
          return;
        }
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (uploadFormData.file.size > MAX_SIZE) {
          setUploadStatus({
            success: false,
            message: 'File size must be less than 50MB'
          });
          return;
        }
      }

      // After validations pass, prepare the request
      let requestBody: {
        URL?: string;
        Content?: string;
        JSProgram?: string;
        debloat?: boolean;
      } = {};

      if (uploadFormData.uploadType === 'url') {
        requestBody.URL = uploadFormData.url;
      } else if (uploadFormData.file) {
        // Convert file to base64
        const fileBuffer = await uploadFormData.file.arrayBuffer();
        const base64String = btoa(
          new Uint8Array(fileBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        requestBody.Content = base64String;
      }

      // Add optional flags if they are provided
      if (uploadFormData.JSProgram.trim()) {
        requestBody.JSProgram = uploadFormData.JSProgram.trim();
      }
      if (uploadFormData.debloat) {
        requestBody.debloat = true;
      }

      const response = await fetch('http://localhost:3000/package', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log('Server response:', { status: response.status, data: responseData });

      if (!response.ok) {
        console.log('Error response:', responseData);
        setUploadStatus({
          success: false,
          message: responseData.error || 'Failed to upload package'
        });
        setLoading(false);
        return;
      }

      // Transform the response to match our PackageData interface if needed
      const packageData = {
        metadata: {
          Name: responseData.Name || responseData.metadata?.Name,
          Version: responseData.Version || responseData.metadata?.Version,
          ID: responseData.ID || responseData.metadata?.ID
        },
        data: {
          URL: responseData.URL || responseData.data?.URL,
          Content: responseData.Content || responseData.data?.Content,
          JSProgram: responseData.JSProgram || responseData.data?.JSProgram,
          debloat: responseData.debloat || responseData.data?.debloat
        }
      };

      // Success case
      setUploadStatus({
        success: true,
        message: `Package ${packageData.metadata.Name}@${packageData.metadata.Version} uploaded successfully!`
      });

      // Refresh the package list
      await fetchPackages();

      // Reset form fields but keep dialog open
      setUploadFormData({
        url: '',
        file: null,
        uploadType: 'url',
        JSProgram: '',
        debloat: false
      });
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to upload package'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (packageId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/package/${packageId}/download`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download package');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `package-${packageId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('Package downloaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while downloading the package');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/package/byRegEx', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ RegEx: searchQuery })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search packages');
      }

      const data = await response.json();
      // Transform the response to match PackageData interface
      const transformedData = data.map((pkg: any) => ({
        metadata: {
          Name: pkg.Name || pkg.metadata?.Name,
          Version: pkg.Version || pkg.metadata?.Version,
          ID: pkg.ID || pkg.metadata?.ID
        },
        data: {
          URL: pkg.URL || pkg.data?.URL,
          Content: pkg.Content || pkg.data?.Content,
          JSProgram: pkg.JSProgram || pkg.data?.JSProgram,
          debloat: pkg.debloat || pkg.data?.debloat
        }
      }));
      setPackages(transformedData);
      setHasBrowsed(true);
      setActiveTab('query'); // Switch to query tab after search
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const ErrorDisplay = ({ message }: { message: string }) => (
    <Alert variant="destructive" className="border-red-500 bg-red-50">
      <AlertDescription className="text-red-600 font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-2xl font-bold">Package Registry Interface</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input 
              placeholder="Search packages with regex..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="upload">Package Management</TabsTrigger>
          <TabsTrigger value="query">Package Query</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary actions - dark background */}
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="w-full bg-slate-900 hover:bg-slate-800">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Package
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload New Package</DialogTitle>
                      <DialogDescription>
                        Upload a new package by providing either a URL or a zip file.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUploadSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label>Upload Type</Label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="uploadType"
                              value="url"
                              checked={uploadFormData.uploadType === 'url'}
                              onChange={(e) => setUploadFormData(prev => ({
                                ...prev,
                                uploadType: e.target.value as 'url' | 'file'
                              }))}
                            />
                            <span>URL</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="uploadType"
                              value="file"
                              checked={uploadFormData.uploadType === 'file'}
                              onChange={(e) => setUploadFormData(prev => ({
                                ...prev,
                                uploadType: e.target.value as 'url' | 'file'
                              }))}
                            />
                            <span>File</span>
                          </label>
                        </div>
                      </div>

                      {uploadFormData.uploadType === 'url' ? (
                        <div className="space-y-2">
                          <Label htmlFor="url">Package URL</Label>
                          <Input
                            id="url"
                            value={uploadFormData.url}
                            onChange={(e) => setUploadFormData(prev => ({ ...prev, url: e.target.value }))}
                            placeholder="https://github.com/owner/repo or https://www.npmjs.com/package/name"
                          />
                          <p className="text-sm text-gray-500">
                            Enter a valid GitHub repository URL or npm package URL
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="file">Package File</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".zip"
                            onChange={handleFileChange}
                          />
                          <p className="text-sm text-gray-500">
                            Upload a zip file (max 50MB)
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="JSProgram">JS Program</Label>
                        <textarea
                          id="JSProgram"
                          className="w-full min-h-[100px] p-2 border rounded-md"
                          value={uploadFormData.JSProgram}
                          onChange={(e) => setUploadFormData(prev => ({ ...prev, JSProgram: e.target.value }))}
                          placeholder="Enter your JS Program here (optional)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Package Options</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="debloat"
                            checked={uploadFormData.debloat}
                            onChange={(e) => setUploadFormData(prev => ({ ...prev, debloat: e.target.checked }))}
                          />
                          <label htmlFor="debloat" className="text-sm">
                            Enable package debloat (removes unnecessary content)
                          </label>
                        </div>
                      </div>

                      {uploadStatus && (
                        <Alert variant={uploadStatus.success ? "default" : "destructive"} 
                              className={`${uploadStatus.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                          <AlertDescription className={`${uploadStatus.success ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            {uploadStatus.message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Secondary actions - light gray background */}
                <Button variant="secondary" className="w-full">
                  <Star className="w-4 h-4 mr-2" />
                  Check Rating
                </Button>
                <Button variant="secondary" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Package
                </Button>

                {/* Optional actions - outline style */}
                <Button variant="outline" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Ingest NPM Package
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const response = await fetch('http://localhost:3000/reset', {
                        method: 'DELETE',
                        headers: {
                          ...getAuthHeaders(),
                          'Content-Type': 'application/json'
                        }
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to reset registry');
                      }

                      setError(null);
                      setSuccessMessage('Reset was successful');
                      // Refresh the package list after reset
                      await fetchPackages();
                    } catch (err) {
                      setSuccessMessage(null);
                      setError(err instanceof Error ? err.message : 'An error occurred while resetting the registry');
                    } finally {
                      setLoading(false);
                      // Clear success message after 5 seconds
                      setTimeout(() => setSuccessMessage(null), 5000);
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {loading ? 'Resetting...' : 'Reset Registry'}
                </Button>
                <Button variant="outline" className="w-full">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Check Package Size
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant="default" 
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  onClick={fetchPackages}
                  disabled={loading}
                >
                  <Package className="w-4 h-4 mr-2" />
                  {loading ? 'Loading...' : 'Browse Package Directory'}
                </Button>
                <Button variant="default" className="w-full bg-slate-900 hover:bg-slate-800">
                  <Search className="w-4 h-4 mr-2" />
                  Fetch Available Versions
                </Button>
                <Button variant="default" className="w-full bg-slate-900 hover:bg-slate-800">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Check Dependency Sizes
                </Button>
              </div>

              {/* Package list or empty state message */}
              {hasBrowsed && (
                packages.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Available Packages</h3>
                    <div className="grid gap-4">
                      {packages.map((pkg) => (
                        <Card key={pkg.metadata.ID} className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-semibold">{pkg.metadata.Name}</h3>
                              <p className="text-sm text-gray-500">Version: {pkg.metadata.Version}</p>
                              <p className="text-sm text-gray-500">ID: {pkg.metadata.ID}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(pkg.metadata.ID)}
                                disabled={loading}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {loading ? 'Downloading...' : 'Download'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 text-center p-8 border rounded-lg bg-gray-50">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Packages Found</h3>
                    <p className="text-gray-500">
                      The package directory is empty. Please upload a package in the Package Management tab first.
                    </p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default" className="mb-4 border-green-500 bg-green-50">
              <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          This interface connects to REST API endpoints for package management operations.
          Each action is validated and processed according to the specified requirements.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PackageRegistry;