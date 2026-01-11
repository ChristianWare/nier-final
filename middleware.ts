/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "./auth.config";

export const { auth: withAuth } = NextAuth(authConfig);

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getRoles(req: any): AppRole[] {
  // Try the most likely places where NextAuth can expose the token/session in middleware
  const roles =
    req?.auth?.user?.roles ??
    req?.auth?.roles ??
    req?.auth?.token?.roles ??
    null;

  if (Array.isArray(roles) && roles.length > 0) {
    return roles as AppRole[];
  }

  // Fallback to legacy single role
  const role =
    req?.auth?.user?.role ??
    req?.auth?.role ??
    req?.auth?.token?.role ??
    undefined;

  return role ? ([role] as AppRole[]) : [];
}

function hasRole(req: any, role: AppRole) {
  return getRoles(req).includes(role);
}

function primaryRole(req: any): AppRole | undefined {
  // Use explicit primary if present, otherwise derive from roles
  const r =
    req?.auth?.user?.role ??
    req?.auth?.role ??
    req?.auth?.token?.role ??
    undefined;

  if (r) return r as AppRole;

  const roles = getRoles(req);
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  if (roles.includes("USER")) return "USER";
  return undefined;
}

function roleHome(req: any) {
  const role = primaryRole(req);
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/driver-dashboard";
  return "/dashboard";
}

export default withAuth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const authPages = new Set(["/login", "/register", "/password-email"]);

  const isSettings =
    pathname === "/settings" || pathname.startsWith("/settings/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDriverDashboard =
    pathname === "/driver-dashboard" ||
    pathname.startsWith("/driver-dashboard/");
  const isUserDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  const authedOnly =
    isSettings || isAdminArea || isDriverDashboard || isUserDashboard;

  const isLoggedIn = !!req.auth;

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

  // ✅ Admin area requires ADMIN
  if (isAdminArea && !hasRole(req, "ADMIN")) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // ✅ Driver dashboard allows DRIVER or ADMIN
  if (isDriverDashboard && !hasRole(req, "DRIVER") && !hasRole(req, "ADMIN")) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // ✅ User dashboard allows USER or ADMIN
  if (isUserDashboard && !hasRole(req, "USER") && !hasRole(req, "ADMIN")) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:css|js(?!on)|mjs|map|jpg|jpeg|png|gif|svg|ico|webp|ttf|woff2?|txt|xml|webmanifest|pdf|zip)).*)",
    "/(api|trpc)(.*)",
  ],
};
