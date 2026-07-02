import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/', '/monitor/:path*'],
};

export function middleware(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c5ef2c' },
    body: JSON.stringify({
      sessionId: 'c5ef2c',
      location: 'middleware.ts:entry',
      message: 'web-monitor request',
      data: {
        pathname: request.nextUrl.pathname,
        basePath: '/monitor',
        hypothesisId: 'A',
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return NextResponse.next();
}
