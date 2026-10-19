import { Skeleton, SkeletonText } from '@/components/skeleton';

export default function TrackerLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonText width="w-36" height="h-7" />
          <SkeletonText width="w-48" height="h-4" />
        </div>
        <Skeleton className="w-36 h-10 rounded-xl" />
      </div>

      {/* Tracker cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonText width="w-32" height="h-5" />
              <Skeleton className="w-16 h-7 rounded-full" />
            </div>
            <Skeleton className="w-full h-3 rounded-full" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="w-12 h-5 rounded" />
                  <Skeleton className="flex-1 h-4 rounded" />
                  <Skeleton className="w-8 h-4 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
