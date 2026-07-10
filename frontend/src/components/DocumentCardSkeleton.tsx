export const DocumentCardSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`card p-6 flex flex-col animate-pulse h-full min-h-[180px] ${className}`}>
    <div className="flex justify-between items-start mb-4">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
    <div className="flex-1 mb-6 space-y-2">
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-4 w-1/3" />
    </div>
    <div className="flex gap-3 mt-auto">
      <div className="skeleton h-12 flex-1 rounded-card" />
      <div className="skeleton h-12 w-24 rounded-card" />
    </div>
  </div>
);
