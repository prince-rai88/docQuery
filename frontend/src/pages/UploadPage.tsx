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
      <h1 className="text-2xl font-semibold text-ink mb-2 tracking-tight">Upload Document</h1>
      <p className="text-sm text-ink-muted mb-6">PDF or plain text, up to 20 MB</p>

      {error && (
        <div className="mb-6 alert-error flex justify-between items-center gap-4">
          <span>{error}</span>
          <button
            onClick={resetForm}
            className="text-red-400 hover:text-red-300 active:text-red-200 underline text-sm font-medium whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded transition-colors duration-150"
          >
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
