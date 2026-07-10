import { useState, useEffect } from 'react';
import { UploadForm } from '../components/UploadForm';
import { documentsApi } from '../api/documents';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const handleUpload = async (file: File, title: string) => {
    setIsUploading(true);
    setError(null);
    try {
      await documentsApi.upload(file, title);
      setIsReady(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred while uploading. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setIsReady(false);
    setError(null);
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Upload Document</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg shadow-sm flex justify-between items-center">
          <span className="text-sm">{error}</span>
          <button onClick={resetForm} className="text-red-700 hover:text-red-900 underline text-sm ml-4 font-medium whitespace-nowrap">
            Try again
          </button>
        </div>
      )}

      <UploadForm 
        onUpload={handleUpload} 
        isUploading={isUploading} 
        isReady={isReady} 
        onReset={resetForm} 
      />
    </div>
  );
}
