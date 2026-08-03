import SongsClient from './songs-client';

export const metadata = { title: 'Songs' };

// No force-dynamic — this page renders a client shell that self-fetches.
// The server sends zero song data; the client fetches /api/songs and caches
// it in module scope so navigating back is instant.
export default function SongsPage() {
  return <SongsClient />;
}
