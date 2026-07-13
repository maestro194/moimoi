import { Skeleton, SkeletonText } from '@/components/skeleton';

export default function AnalysisLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonText width="w-32" height="h-7" />
        <SkeletonText width="w-56" height="h-4" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Chart area */}
      <Skeleton className="w-full h-64 rounded-2xl" />

      {/* Suggestions list */}
      <div className="space-y-2">
        <SkeletonText width="w-48" height="h-5" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <Skeleton className="w-14 h-5 rounded-full shrink-0" />
            <Skeleton className="flex-1 h-4 rounded" />
            <SkeletonText width="w-10" height="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
