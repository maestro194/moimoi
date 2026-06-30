import { fetchSongs, buildSongMap, detectCurrentVersion, getSongCategories } from '@/lib/song-db';
import SongsClient from './songs-client';
import { getSetting } from '@/lib/maimai-sync';

export const metadata = { title: 'Songs' };

export default async function SongsPage() {
  try {
    const songs = await fetchSongs();
    const versionStr = await getSetting('maimai_version');
    const currentVersion = versionStr ? parseInt(versionStr, 10) : detectCurrentVersion(songs);
    const categories = getSongCategories(songs);
    return <SongsClient songs={songs} currentVersion={currentVersion} categories={categories} />;
  } catch {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
        Failed to load song database.
      </div>
    );
  }
}
