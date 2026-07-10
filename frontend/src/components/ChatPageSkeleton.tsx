export const ChatPageSkeleton = () => (
  <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
    <div className="card border-b-0 rounded-b-none px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex flex-col gap-2 flex-1">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-6 w-2/3 max-w-md" />
      </div>
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
    <div className="flex-1 bg-canvas border-x border-border p-6">
      <div className="flex flex-col max-w-3xl mx-auto gap-6">
        <div className="flex gap-3">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="skeleton h-16 w-2/3 max-w-sm rounded-card" />
        </div>
        <div className="flex gap-3 flex-row-reverse">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="skeleton h-12 w-1/2 max-w-xs rounded-card" />
        </div>
        <div className="flex gap-3">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="skeleton h-24 w-3/4 max-w-md rounded-card" />
        </div>
      </div>
    </div>
    <div className="card border-t-0 rounded-t-none p-4 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-12 w-full rounded-card" />
      </div>
    </div>
  </div>
);
