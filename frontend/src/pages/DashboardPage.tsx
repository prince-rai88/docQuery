import { useDocuments } from '../hooks/useDocuments';
import { DocumentCard, getBentoClass } from '../components/DocumentCard';
import { DocumentCardSkeleton } from '../components/DocumentCardSkeleton';
import { EmptyState } from '../components/EmptyState';

const BENTO_THRESHOLD = 4;

export default function DashboardPage() {
  const { documents, isLoading, error, deleteDocument, refetch } = useDocuments();
  const useBento = documents.length >= BENTO_THRESHOLD;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink mb-6 tracking-tight">Your Documents</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <DocumentCardSkeleton key={i} className={i === 1 ? 'md:col-span-2 md:row-span-2' : ''} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="alert-error flex items-center justify-between gap-4">
          <p>{error}</p>
          <button onClick={refetch} className="btn-secondary shrink-0">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink mb-6 tracking-tight">Your Documents</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Your Documents</h1>
        <span className="text-sm text-ink-faint">{documents.length} total</span>
      </div>
      <div
        className={
          useBento
            ? 'grid grid-cols-1 gap-4 md:grid-cols-3 auto-rows-fr'
            : 'grid grid-cols-1 gap-4 md:grid-cols-3'
        }
      >
        {documents.map((doc, index) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onDelete={deleteDocument}
            className={useBento ? getBentoClass(index) : ''}
            featured={useBento && index === 0}
          />
        ))}
      </div>
    </div>
  );
}
