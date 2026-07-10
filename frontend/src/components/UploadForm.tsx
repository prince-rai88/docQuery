import { useState, useRef } from 'react';
import { Spinner } from './Spinner';

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
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center">
        <Spinner className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Uploading and Processing...</h3>
        <p className="mt-2 text-sm text-slate-500">This might take a moment if the document is large.</p>
        <div className="mt-6 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 animate-[progress_2s_ease-in-out_infinite] rounded-full w-1/2"></div>
         </div>
      </div>
    );
  }

  if (isReady) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-emerald-200 bg-emerald-50 text-center">
        <svg className="w-12 h-12 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h3 className="text-lg font-medium text-emerald-900">Document ready!</h3>
        <p className="mt-2 text-sm text-emerald-700">Your document has been successfully processed.</p>
        <div className="mt-6">
          <button onClick={onReset} className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium mr-4 transition-colors">
            Upload another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Document File (PDF or TXT)</label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt"
          required
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-2">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leave blank to use filename"
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
        />
      </div>
      <button
        type="submit"
        disabled={!file}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Upload Document
      </button>
    </form>
  );
};
