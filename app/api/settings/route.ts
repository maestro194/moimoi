import { saveSetting, getSetting } from '@/lib/maimai-sync';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const region = await getSetting('maimai_region') ?? 'intl';
    
    const segaId = await getSetting('maimai_sega_id') ?? '';
    const segaPassword = await getSetting('maimai_sega_password') ?? '';
    
    const maskedSegaPass = segaPassword ? '•'.repeat(segaPassword.length) : '';
    return Response.json({ region, segaId, segaPassword: maskedSegaPass });
  } catch {
    return Response.json({ region: 'intl', segaId: '', segaPassword: '' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { region, segaId, segaPassword } = body as { region?: string; segaId?: string; segaPassword?: string; };
    if (region !== undefined) await saveSetting('maimai_region', region);
    if (segaId !== undefined) await saveSetting('maimai_sega_id', segaId.trim());
    if (segaPassword !== undefined) await saveSetting('maimai_sega_password', segaPassword);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

