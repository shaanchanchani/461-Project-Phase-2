import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Package, Upload, Download, RotateCcw, RefreshCw, Star } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';

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
  rating?: {
    BusFactor: number;
    Correctness: number;
    RampUp: number;
    ResponsiveMaintainer: number;
    LicenseScore: number;
    GoodPinningPractice: number;
    PullRequest: number;
    NetScore: number;
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
  const [loadingPackages, setLoadingPackages] = useState<{ [key: string]: boolean }>({});
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [updateFormData, setUpdateFormData] = useState({
    url: '',
    content: '',
    updateType: 'url' as 'url' | 'content'
  });
  const [loadingRatings, setLoadingRatings] = useState<Record<string, boolean>>({});
  const [showRatings, setShowRatings] = useState<Record<string, boolean>>({});
  const [packageCosts, setPackageCosts] = useState<Record<string, { standaloneCost: number; totalCost: number } | null>>({});

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/package/byRegEx', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ RegEx: ".*" })  // Using regex to match all packages
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
      setHasBrowsed(true);
      setActiveTab('upload'); // Switch to upload tab after browsing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching packages');
      setTimeout(() => setError(null), 5000);
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
      setLoadingPackages(prev => ({ ...prev, [packageId]: true })); // Set specific package loading to true
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
      setLoadingPackages(prev => ({ ...prev, [packageId]: false })); // Reset specific package loading to false
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleCheckPackageCost = async (packageId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3000/package/${packageId}/cost`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch package cost');
      }

      const costData = await response.json();
      const packageCost = costData[packageId];
      if (!packageCost) {
        throw new Error('Invalid cost data received');
      }
      
      setPackageCosts(prev => ({
        ...prev,
        [packageId]: packageCost
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching package cost');
    } finally {
      setLoading(false);
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
      setActiveTab('upload'); // Switch to upload tab after search
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePackage = async (packageId: string) => {
    const pkg = packages.find(p => p.metadata.ID === packageId);
    if (!pkg) {
      setError('Package not found');
      return;
    }
    setSelectedPackage(pkg);
    setUpdateFormData({
      url: '',
      content: '',
      updateType: 'url'
    });
    setUpdateDialogOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setLoading(true);
    setError(null);
    try {
      const updateData = {
        metadata: {
          Name: selectedPackage.metadata.Name,
          Version: selectedPackage.metadata.Version,
          ID: selectedPackage.metadata.ID
        },
        data: updateFormData.updateType === 'url'
          ? { URL: updateFormData.url }
          : { Content: updateFormData.content }
      };

      const response = await fetch(`http://localhost:3000/package/${selectedPackage.metadata.ID}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update package');
      }

      setSuccessMessage('Package updated successfully');
      setUpdateDialogOpen(false);
      await fetchPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the package');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const fetchPackageRating = async (packageId: string) => {
    try {
      setLoadingRatings(prev => ({ ...prev, [packageId]: true }));
      
      const response = await fetch(`http://localhost:3000/package/${packageId}/rate`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch package rating');
      }

      const ratingData = await response.json();
      
      // Update the packages state with the new rating
      setPackages(prevPackages => 
        prevPackages.map(pkg => 
          pkg.metadata.ID === packageId 
            ? { ...pkg, rating: ratingData }
            : pkg
        )
      );

      // Automatically show the rating when it's fetched
      setShowRatings(prev => ({ ...prev, [packageId]: true }));

    } catch (error) {
      console.error('Error fetching package rating:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch package rating');
    } finally {
      setLoadingRatings(prev => ({ ...prev, [packageId]: false }));
    }
  };

  const toggleRating = (packageId: string) => {
    if (!packages.find(p => p.metadata.ID === packageId)?.rating) {
      // If no rating exists, fetch it
      fetchPackageRating(packageId);
    } else {
      // If rating exists, toggle its visibility
      setShowRatings(prev => ({
        ...prev,
        [packageId]: !prev[packageId]
      }));
    }
  };

  const renderRating = (pkg: PackageData) => {
    const rating = pkg.rating;
    
    if (loadingRatings[pkg.metadata.ID]) {
      return (
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin h-4 w-4" />
          <span>Loading rating...</span>
        </div>
      );
    }

    if (!rating) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
          onClick={() => fetchPackageRating(pkg.metadata.ID)}
        >
          <Star className="h-4 w-4" />
          <span>Get Rating</span>
        </Button>
      );
    }

    return (
      <div className="space-y-2 border-b pb-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Net Score:</span>
          <div className="flex items-center">
            <Star className={`h-4 w-4 ${rating.NetScore >= 0.5 ? 'text-yellow-400' : 'text-gray-300'}`} />
            <span className="ml-1">{(rating.NetScore * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Bus Factor:</span>
            <span>{(rating.BusFactor * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Correctness:</span>
            <span>{(rating.Correctness * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Ramp Up:</span>
            <span>{(rating.RampUp * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Responsive Maintainer:</span>
            <span>{(rating.ResponsiveMaintainer * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>License Score:</span>
            <span>{(rating.LicenseScore * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Good Pinning Practice:</span>
            <span>{(rating.GoodPinningPractice * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Pull Request:</span>
            <span>{(rating.PullRequest * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const ErrorDisplay = ({ message }: { message: string }) => (
    <Alert variant="destructive" className="border-red-500 bg-red-50">
      <AlertDescription className="text-red-600 font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );

  return (
    <main className="container mx-auto p-4 min-h-screen">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive" className="border-red-500 bg-red-50">
            <AlertDescription className="text-red-600 font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-600 font-medium">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

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
          <Button 
            onClick={handleSearch} 
            disabled={loading}
          >
            Search
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-1">
            <TabsTrigger value="upload">Package Management</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="default" 
                        className="w-full bg-slate-900 hover:bg-slate-800"
                        aria-label="Upload new package"
                      >
                        <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
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
                        <div className="space-y-2" role="radiogroup">
                          <Label id="upload-type-label">Upload Type</Label>
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

                  <Button 
                    variant="outline" 
                    className="w-full bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white"
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
                </div>
              </CardContent>
            </Card>

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

                  <div className="space-y-4" role="list" aria-label="Package list">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.metadata.ID}
                        className="bg-white p-6 rounded-lg shadow-md"
                        role="listitem"
                        aria-label={`Package: ${pkg.metadata.Name}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold" tabIndex={0}>
                              {pkg.metadata.Name}
                            </h3>
                            <p className="text-gray-600" tabIndex={0} aria-label="Package version">
                              Version: {pkg.metadata.Version}
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(pkg.metadata.ID)}
                              disabled={loadingPackages[pkg.metadata.ID]}
                              aria-label={`Download ${pkg.metadata.Name}`}
                            >
                              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                              {loadingPackages[pkg.metadata.ID] ? 'Downloading...' : 'Download'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckPackageCost(pkg.metadata.ID)}
                              disabled={loadingPackages[pkg.metadata.ID]}
                              aria-label={`Check cost for ${pkg.metadata.Name}`}
                            >
                              Check Package Cost
                            </Button>
                            {loadingRatings[pkg.metadata.ID] ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled
                              >
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                Loading Rating...
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRating(pkg.metadata.ID)}
                              >
                                <Star className={`h-4 w-4 mr-1 ${pkg.rating && showRatings[pkg.metadata.ID] ? 'text-yellow-400' : ''}`} />
                                {!pkg.rating || !showRatings[pkg.metadata.ID] ? 'Get Rating' : 'Hide Rating'}
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdatePackage(pkg.metadata.ID)}
                              disabled={loadingPackages[pkg.metadata.ID]}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              {loadingPackages[pkg.metadata.ID] ? 'Updating...' : 'Update'}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {pkg.rating && showRatings[pkg.metadata.ID] && (
                            <div className="space-y-2 border-b pb-4">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Net Score:</span>
                                <div className="flex items-center">
                                  <Star className={`h-4 w-4 ${pkg.rating.NetScore >= 0.5 ? 'text-yellow-400' : 'text-gray-300'}`} />
                                  <span className="ml-1">{(pkg.rating.NetScore * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="text-sm space-y-1">
                                {Object.entries(pkg.rating).map(([key, value]) => (
                                  key !== 'NetScore' && (
                                    <div className="flex justify-between" key={key}>
                                      <span>{key}:</span>
                                      <span>{(value * 100).toFixed(1)}%</span>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                          {packageCosts[pkg.metadata.ID] && (
                            <div 
                              className="text-sm text-gray-800 mt-2 p-2 bg-gray-50 rounded-md" 
                              role="region" 
                              aria-label="Package cost information"
                              tabIndex={0}
                            >
                              <div>Standalone Cost: ${packageCosts[pkg.metadata.ID]?.standaloneCost.toFixed(2)} MB</div>
                              <div>Total Cost: ${packageCosts[pkg.metadata.ID]?.totalCost.toFixed(2)} MB</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="mb-4 border-green-500 bg-green-50">
                <AlertDescription className="text-green-600">
                  {successMessage}
                </AlertDescription>
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

        {/* Update Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Package</DialogTitle>
              <DialogDescription>
                Update the package by providing either a new URL or content.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Update Type</Label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="updateType"
                      value="url"
                      checked={updateFormData.updateType === 'url'}
                      onChange={(e) => setUpdateFormData(prev => ({
                        ...prev,
                        updateType: e.target.value as 'url' | 'content'
                      }))}
                    />
                    <span>URL</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="updateType"
                      value="content"
                      checked={updateFormData.updateType === 'content'}
                      onChange={(e) => setUpdateFormData(prev => ({
                        ...prev,
                        updateType: e.target.value as 'url' | 'content'
                      }))}
                    />
                    <span>Content</span>
                  </label>
                </div>
              </div>

              {updateFormData.updateType === 'url' ? (
                <div className="space-y-2">
                  <Label htmlFor="url">Package URL</Label>
                  <Input
                    id="url"
                    value={updateFormData.url}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://github.com/owner/repo or https://www.npmjs.com/package/name"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="content">Package Content (Base64)</Label>
                  <textarea
                    id="content"
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    value={updateFormData.content}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter base64 encoded package content"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Package'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
};

export default PackageRegistry;
