import { saveSetting, getSetting } from '@/lib/maimai-sync';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clal = await getSetting('maimai_clal') ?? '';
    const region = await getSetting('maimai_region') ?? 'intl';
    const lastSync = await getSetting('last_sync') ?? null;
    const versionStr = await getSetting('maimai_version') ?? '';
    const segaId = await getSetting('maimai_sega_id') ?? '';
    const segaPassword = await getSetting('maimai_sega_password') ?? '';
    
    // Mask the cookie for display security — only show last 8 chars
    const maskedClal = clal.length > 8 ? '•'.repeat(clal.length - 8) + clal.slice(-8) : clal;
    const maskedSegaPass = segaPassword ? '•'.repeat(segaPassword.length) : '';
    return Response.json({ clal: maskedClal, region, lastSync, version: versionStr, segaId, segaPassword: maskedSegaPass });
  } catch {
    return Response.json({ clal: '', region: 'intl', lastSync: null, version: '', segaId: '', segaPassword: '' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clal, region, version, segaId, segaPassword } = body as { clal?: string; region?: string; version?: string; segaId?: string; segaPassword?: string; };
    if (clal !== undefined) await saveSetting('maimai_clal', clal.trim());
    if (region !== undefined) await saveSetting('maimai_region', region);
    if (version !== undefined) await saveSetting('maimai_version', version);
    if (segaId !== undefined) await saveSetting('maimai_sega_id', segaId.trim());
    if (segaPassword !== undefined) await saveSetting('maimai_sega_password', segaPassword);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
