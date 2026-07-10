import { useState, useRef } from 'react';

interface UploadFormProps {
  onUpload: (file: File, title: string) => Promise<void>;
  isUploading: boolean;
  isReady: boolean;
  onReset: () => void;
}

export const UploadForm = ({ onUpload, isUploading, isReady, onReset }: UploadFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    onUpload(file, title || file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  if (isUploading) {
    return (
      <div className="card p-8 animate-pulse">
        <div className="skeleton h-6 w-48 mx-auto mb-4" />
        <div className="skeleton h-4 w-64 mx-auto mb-8" />
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full w-1/2 animate-pulse" />
        </div>
        <p className="mt-6 text-sm text-ink-muted text-center">Uploading and processing…</p>
      </div>
    );
  }

  if (isReady) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-ink">Document ready</h3>
        <p className="mt-2 text-sm text-ink-muted">Your document has been processed and is ready to chat.</p>
        <div className="mt-6">
          <button onClick={onReset} className="btn-secondary">
            Upload another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-8">
      <div className="mb-6">
        <label className="block text-sm font-medium text-ink mb-2">
          Document File (PDF or TXT)
        </label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt"
          required
          className="block w-full text-sm text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-card file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 file:transition-colors file:duration-150 file:cursor-pointer"
        />
      </div>
      <div className="mb-8">
        <label className="block text-sm font-medium text-ink mb-2">
          Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leave blank to use filename"
          className="input-field text-sm"
        />
      </div>
      <button type="submit" disabled={!file} className="btn-primary-block">
        Upload Document
      </button>
    </form>
  );
};
