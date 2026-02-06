/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "./auth.config";

export const { auth: withAuth } = NextAuth(authConfig);

type AppRole = "USER" | "ADMIN" | "DRIVER" | "CORPORATE";

/**
 * NextAuth middleware (Edge) exposes auth in slightly different shapes.
 * We'll normalize it to roles[] only.
 */
function getRoles(req: any): AppRole[] {
  const roles =
    req?.auth?.user?.roles ??
    req?.auth?.roles ??
    req?.auth?.token?.roles ??
    null;

  return Array.isArray(roles) ? (roles as AppRole[]) : [];
}

function hasAnyRole(req: any, allowed: AppRole[]) {
  const roles = getRoles(req);
  if (!roles.length) return false;
  return allowed.some((r) => roles.includes(r));
}

function roleHome(req: any) {
  if (hasAnyRole(req, ["ADMIN"])) return "/admin";
  if (hasAnyRole(req, ["DRIVER"])) return "/driver-dashboard";
  if (hasAnyRole(req, ["CORPORATE"])) return "/corporate";
  return "/dashboard";
}

export default withAuth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // ✅ Stripe must be able to POST here with NO auth/middleware interference
  if (pathname === "/api/stripe/webhook") return NextResponse.next();

  // ✅ NextAuth internal routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const authPages = new Set(["/login", "/register", "/password-email"]);

  // ✅ Public pages that don't require authentication
  const publicPages = new Set(["/set-password", "/reset-password"]);
  if (publicPages.has(pathname)) return NextResponse.next();

  const isSettings =
    pathname === "/settings" || pathname.startsWith("/settings/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDriverDashboard =
    pathname === "/driver-dashboard" ||
    pathname.startsWith("/driver-dashboard/");
  const isUserDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isCorporateArea =
    pathname === "/corporate" || pathname.startsWith("/corporate/");

  const authedOnly =
    isSettings ||
    isAdminArea ||
    isDriverDashboard ||
    isUserDashboard ||
    isCorporateArea;

  const isLoggedIn = Boolean((req as any).auth?.user);

  // Logged-in users should not see auth pages
  if (isLoggedIn && authPages.has(pathname)) {
    return NextResponse.redirect(new URL(roleHome(req), nextUrl));
  }

  // Not logged in → redirect to login for protected areas
  if (!isLoggedIn && authedOnly) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Corporate users landing on /dashboard should go to /corporate
  if (
    isUserDashboard &&
    hasAnyRole(req, ["CORPORATE"]) &&
    !hasAnyRole(req, ["ADMIN"])
  ) {
    return NextResponse.redirect(new URL("/corporate", nextUrl));
  }

  // Admin area requires ADMIN
  if (isAdminArea && !hasAnyRole(req, ["ADMIN"])) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Driver dashboard allows DRIVER or ADMIN
  if (isDriverDashboard && !hasAnyRole(req, ["DRIVER", "ADMIN"])) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Corporate area requires CORPORATE or ADMIN
  if (isCorporateArea && !hasAnyRole(req, ["CORPORATE", "ADMIN"])) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // User dashboard allows USER or ADMIN
  if (isUserDashboard && !hasAnyRole(req, ["USER", "ADMIN"])) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // ✅ exclude Stripe webhook + all static assets
    "/((?!api/stripe/webhook|_next|.*\\.(?:css|js(?!on)|mjs|map|jpg|jpeg|png|gif|svg|ico|webp|ttf|woff2?|txt|xml|webmanifest|pdf|zip)).*)",
  ],
};
