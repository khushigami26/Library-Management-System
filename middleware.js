import { NextResponse } from "next/server";
import { cookies } from 'next/headers';

// Simplified middleware that avoids Node.js crypto module
export async function middleware(request) {
  // Paths that don't require authentication
  const publicPaths = [
    '/',
    '/signin',
    '/signup',
    '/api/signin',
    '/api/signup',
    '/api/auth/verify', // Allow authentication check
    '/api/activities', // Allow activity logging (handles its own auth)
  ];

  // Check if the path is public
  const path = request.nextUrl.pathname;
  const isPublicPath = publicPaths.some(
    (publicPath) => path === publicPath ||
      path === '/api/auth/verify' || // Always allow verification endpoint exactly
      path.startsWith('/api/signin') ||
      path.startsWith('/api/signup') ||
      path.includes('_next') ||
      path.includes('favicon.ico')
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Simple check for token existence
  try {
    const cookiesList = await cookies();
    const hasToken = cookiesList.has('token');

    if (!hasToken) {
      // No token found, redirect to signin
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      } else {
        return NextResponse.redirect(new URL('/signin', request.url));
      }
    }

    // For role-based routes, we'll rely on client-side checks and API verification
    // This avoids using JWT verification in the middleware

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);

    // In case of error, redirect to signin as a fallback
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (Next.js data fetching)
     * - api/auth/verify (authentication verification endpoint)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|_next/data|api/auth/verify|favicon.ico).*)',
  ],
};
