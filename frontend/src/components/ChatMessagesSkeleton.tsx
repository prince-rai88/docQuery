export const ChatMessagesSkeleton = () => (
  <div className="flex flex-col max-w-3xl mx-auto gap-6 animate-pulse">
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
      <div className="skeleton h-20 w-3/4 max-w-md rounded-card" />
    </div>
  </div>
);
