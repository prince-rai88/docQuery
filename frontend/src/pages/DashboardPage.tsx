import { useDocuments } from '../hooks/useDocuments';
import { DocumentCard } from '../components/DocumentCard';
import { EmptyState } from '../components/EmptyState';


export default function DashboardPage() {
  const { documents, isLoading, error, deleteDocument, refetch } = useDocuments();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Documents</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-6"></div>
              <div className="flex space-x-3 mt-4">
                <div className="h-8 bg-slate-200 rounded flex-1"></div>
                <div className="h-8 bg-slate-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center justify-between shadow-sm">
          <p>{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 border border-red-600 text-red-700 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Documents</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Documents</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <DocumentCard 
            key={doc.id} 
            document={doc} 
            onDelete={deleteDocument} 
          />
        ))}
      </div>
    </div>
  );
}
