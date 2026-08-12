import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

const AUTH_PAGES = ["/signin", "/signup"];
const APP_PATHS = [
  "/dashboard",
  "/expenses",
  "/analytics",
  "/people",
  "/money-owed",
  "/budgets",
  "/settings",
];

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.some((path) => matches(pathname, path));
  const isAppPage = APP_PATHS.some((path) => matches(pathname, path));

  if (!isAuthPage && !isAppPage) {
    return NextResponse.next({ request });
  }

  if (!isSupabaseConfigured()) {
    if (isAppPage) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAppPage && !user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/signin/:path*",
    "/signup/:path*",
    "/dashboard/:path*",
    "/expenses/:path*",
    "/analytics/:path*",
    "/people/:path*",
    "/money-owed/:path*",
    "/budgets/:path*",
    "/settings/:path*",
  ],
};