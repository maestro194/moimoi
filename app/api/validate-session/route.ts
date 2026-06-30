import { validateSession } from '@/lib/maimai-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { valid, debug } = await validateSession();
    return Response.json({ valid, debug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ valid: false, error: message, debug: message });
  }
}
