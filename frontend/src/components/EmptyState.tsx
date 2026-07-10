import { Link } from 'react-router-dom';

export const EmptyState = () => (
  <div className="card text-center py-16 px-8">
    <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
      <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-ink">No documents yet</h3>
    <p className="mt-2 text-sm text-ink-muted max-w-sm mx-auto">
      Upload a PDF or text file to start asking questions about your content.
    </p>
    <div className="mt-8">
      <Link to="/upload" className="btn-primary px-8">
        Upload your first document
      </Link>
    </div>
  </div>
);
