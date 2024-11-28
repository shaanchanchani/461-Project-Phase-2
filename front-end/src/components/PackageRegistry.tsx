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
  Name: string;
  Version: string;
  ID: string;
}

interface UploadFormData {
  name: string;
  version: string;
  url: string;
  file: File | null;
  uploadType: 'url' | 'file';
}

const PackageRegistry: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    name: '',
    version: '',
    url: '',
    file: null,
    uploadType: 'url'
  });
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/packages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ offset: '0' }), // You can make this dynamic later
      });

      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }

      const data = await response.json();
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching packages');
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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let packageContent = null;
      
      if (uploadFormData.uploadType === 'file' && uploadFormData.file) {
        // Convert file to base64
        const reader = new FileReader();
        packageContent = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFormData.file!);
        });
        // Remove the data:application/zip;base64, prefix
        packageContent = (packageContent as string).split(',')[1];
      }

      const response = await fetch('http://localhost:3000/package', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          metadata: {
            Name: uploadFormData.name,
            Version: uploadFormData.version,
          },
          data: uploadFormData.uploadType === 'url'
            ? { URL: uploadFormData.url }
            : { Content: packageContent }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload package');
      }

      const result = await response.json();
      setUploadStatus({ success: true, message: 'Package uploaded successfully!' });
      setUploadDialogOpen(false);
      // Reset form
      setUploadFormData({
        name: '',
        version: '',
        url: '',
        file: null,
        uploadType: 'url'
      });
      // Refresh the package list
      fetchPackages();
    } catch (err) {
      setUploadStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to upload package',
      });
    } finally {
      setLoading(false);
    }
  };

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
              className="flex-1"
            />
            <Button variant="secondary">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upload">
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
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload New Package</DialogTitle>
                      <DialogDescription>
                        Enter the package details below. You can upload a package by providing its GitHub/NPM URL or uploading a ZIP file.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Package Name</Label>
                        <Input
                          id="name"
                          value={uploadFormData.name}
                          onChange={(e) => setUploadFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., my-awesome-package"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="version">Version</Label>
                        <Input
                          id="version"
                          value={uploadFormData.version}
                          onChange={(e) => setUploadFormData(prev => ({ ...prev, version: e.target.value }))}
                          placeholder="e.g., 1.0.0"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Method</Label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="uploadType"
                              value="url"
                              checked={uploadFormData.uploadType === 'url'}
                              onChange={(e) => setUploadFormData(prev => ({ 
                                ...prev, 
                                uploadType: e.target.value as 'url' | 'file',
                                file: null,
                                url: ''
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
                                uploadType: e.target.value as 'url' | 'file',
                                file: null,
                                url: ''
                              }))}
                            />
                            <span>ZIP File</span>
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
                            placeholder="GitHub or NPM URL"
                            required={uploadFormData.uploadType === 'url'}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="file">Package ZIP File</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".zip"
                            onChange={handleFileChange}
                            required={uploadFormData.uploadType === 'file'}
                          />
                        </div>
                      )}

                      {uploadStatus && (
                        <Alert variant={uploadStatus.success ? "default" : "destructive"}>
                          <AlertDescription>{uploadStatus.message}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setUploadDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="default" className="w-full bg-slate-900 hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" />
                  Download Package
                </Button>

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
          
          {packages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Packages</h3>
              <div className="grid gap-4">
                {packages.map((pkg) => (
                  <Card key={pkg.ID}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{pkg.Name}</h4>
                          <p className="text-sm text-gray-500">Version: {pkg.Version}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button variant="destructive" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Registry
          </Button>
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