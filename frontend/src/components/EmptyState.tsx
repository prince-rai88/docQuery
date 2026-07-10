import { Link } from 'react-router-dom';

export const EmptyState = () => (
  <div className="text-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <h3 className="mt-2 text-sm font-semibold text-slate-900">No documents</h3>
    <p className="mt-1 text-sm text-slate-500">Get started by uploading your first document.</p>
    <div className="mt-6">
      <Link
        to="/upload"
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Upload Document
      </Link>
    </div>
  </div>
);
