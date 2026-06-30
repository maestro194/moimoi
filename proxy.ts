import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  
  // If no password is set, disable Basic Auth
  if (!appPassword) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // We only care about the password. Username can be anything.
    if (pwd === appPassword) {
      return NextResponse.next();
    }
  }

  // Request credentials
  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes can have their own auth, or we can protect them too, but let's protect everything)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
