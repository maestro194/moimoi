import { Skeleton, SkeletonText, SkeletonBar } from '@/components/skeleton';

export default function ScoresLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* SyncBar */}
      <SkeletonBar />

      {/* Rating summary row */}
      <div className="flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-16 rounded-xl" />
        ))}
      </div>

      {/* Filter / search bar */}
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
      </div>

      {/* Score rows */}
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonText width="w-40" height="h-4" />
              <SkeletonText width="w-24" height="h-3" />
            </div>
            <Skeleton className="w-16 h-6 rounded-full shrink-0" />
            <SkeletonText width="w-12" height="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
