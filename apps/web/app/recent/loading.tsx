import { Skeleton, SkeletonText, SkeletonBar } from '@/components/skeleton';

export default function RecentLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* SyncBar */}
      <SkeletonBar />

      {/* Play log entries */}
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center px-4 py-3 rounded-2xl bg-white/5">
            {/* Jacket */}
            <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
            {/* Info */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <SkeletonText width="w-48" height="h-4" />
              <SkeletonText width="w-28" height="h-3" />
              <SkeletonText width="w-20" height="h-3" />
            </div>
            {/* Score */}
            <div className="text-right space-y-1.5 shrink-0">
              <SkeletonText width="w-20" height="h-5" />
              <SkeletonText width="w-12" height="h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
