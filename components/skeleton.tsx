// Shared skeleton primitives used by loading.tsx files
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/5 ${className}`}
    />
  );
}

export function SkeletonText({ width = 'w-32', height = 'h-4' }: { width?: string; height?: string }) {
  return <Skeleton className={`${width} ${height}`} />;
}

export function SkeletonBar({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-10 w-full rounded-2xl ${className}`} />;
}
