import { Skeleton, SkeletonText, SkeletonBar } from '@/components/skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonText width="w-32" height="h-7" />
          <SkeletonText width="w-52" height="h-4" />
        </div>
        <Skeleton className="w-28 h-10 rounded-xl" />
      </div>

      {/* SyncBar placeholder */}
      <SkeletonBar />

      {/* Profile card */}
      <div className="flex gap-6 items-start">
        <Skeleton className="w-28 h-28 rounded-xl shrink-0" />
        <div className="space-y-3 flex-1">
          <SkeletonText width="w-48" height="h-8" />
          <SkeletonText width="w-36" height="h-5" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonText key={i} width="w-full" height="h-5" />
            ))}
          </div>
        </div>
      </div>

      {/* B50 lists */}
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map(col => (
          <div key={col} className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-3">
            <SkeletonText width="w-32" height="h-5" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="w-14 h-5 rounded" />
                <Skeleton className="flex-1 h-4 rounded" />
                <Skeleton className="w-8 h-5 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
