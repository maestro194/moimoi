import { Skeleton, SkeletonText, SkeletonBar } from '@/components/skeleton';

export default function SongsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-3">

      {/* Title + count */}
      <div className="flex items-baseline gap-3">
        <SkeletonText width="w-16" height="h-7" />
        <SkeletonText width="w-40" height="h-4" />
      </div>

      {/* Filter bar */}
      <div
        className="rounded-2xl p-3 space-y-2.5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Row 1: search + dropdowns + toggles */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="flex-1 min-w-44 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-24 h-9 rounded-xl" />
        </div>
        {/* Row 2: tags bar */}
        <div className="flex items-center gap-2 px-1">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <SkeletonText width="w-8" height="h-3.5" />
          <Skeleton className="ml-auto w-4 h-4 rounded" />
        </div>
      </div>

      {/* Column header */}
      <div
        className="rounded-xl px-4 py-2 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <SkeletonText width="flex-1" height="h-3" />
        <SkeletonText width="w-24 hidden md:block" height="h-3" />
        <SkeletonText width="w-12 hidden sm:block" height="h-3" />
        <SkeletonText width="w-20 hidden sm:block" height="h-3" />
        <SkeletonText width="w-12" height="h-3" />
      </div>

      {/* Song rows */}
      <div className="space-y-0 rounded-b-2xl overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-2 gap-3 border-b border-white/5 bg-white/[0.02]"
          >
            {/* Jacket */}
            <Skeleton className="w-10 h-10 rounded shrink-0" />

            {/* Title / artist */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Vary widths for visual realism */}
              <SkeletonText
                width={['w-48', 'w-56', 'w-40', 'w-52', 'w-44'][i % 5]}
                height="h-3.5"
              />
              <SkeletonText
                width={['w-28', 'w-32', 'w-24', 'w-36', 'w-20'][i % 5]}
                height="h-3"
              />
            </div>

            {/* Version — hidden on mobile */}
            <SkeletonText width="w-20 hidden md:block" height="h-3" />

            {/* Type badge — hidden on mobile */}
            <Skeleton className="w-8 h-3.5 rounded hidden sm:block shrink-0" />

            {/* Diff pill — hidden on mobile */}
            <Skeleton className="w-16 h-4 rounded-sm hidden sm:block shrink-0" />

            {/* Level number */}
            <SkeletonText width="w-10" height="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
