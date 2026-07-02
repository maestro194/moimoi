import React from 'react';

export function FCBadge({ fc, className }: { fc: string | null | undefined, className?: string }) {
  if (!fc || fc.toLowerCase() === 'none') return null;
  const normalized = fc.toUpperCase();
  const colors: Record<string, string> = {
    'AP+': '#f97316', 'AP': '#f97316', // Orange
    'FC+': '#22c55e', 'FC': '#22c55e', // Green
  };
  const color = colors[normalized] || '#ccc';
  return (
    <span 
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${className || ''}`} 
      style={{ color: color, backgroundColor: `${color}1A`, borderColor: `${color}40` }}
    >
      {normalized}
    </span>
  );
}

export function FSBadge({ fs, className }: { fs: string | null | undefined, className?: string }) {
  if (!fs || fs.toLowerCase() === 'none') return null;
  const normalized = fs.toUpperCase();
  const colors: Record<string, string> = {
    'FDX+': '#f97316', 'FDX': '#f97316', // Orange
    'FS+': '#3b82f6', 'FS': '#3b82f6',   // Blue
    'SYNC': '#3b82f6',
  };
  const color = colors[normalized] || '#ccc';
  return (
    <span 
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${className || ''}`} 
      style={{ color: color, backgroundColor: `${color}1A`, borderColor: `${color}40` }}
    >
      {normalized}
    </span>
  );
}
