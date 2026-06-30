import { syncFromMaimaiNet } from '@/lib/maimai-sync';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
// Max duration for the serverless function (Vercel hobby limit is usually 10s, but we'll ask for 60s if possible)
export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };
      
      try {
        const result = await syncFromMaimaiNet((msg) => {
          send({ type: 'progress', message: msg });
        });
        send({ type: 'done', result });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
