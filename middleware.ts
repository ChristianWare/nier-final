/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "./auth.config";

export const { auth: withAuth } = NextAuth(authConfig);

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getRole(req: any): AppRole | undefined {
  // With the updated auth.config.ts we standardize on token.userId + token.role
  // Role typically appears here in middleware:
  return (
    req?.auth?.user?.role ??
    req?.auth?.role ??
    req?.auth?.token?.role ??
    undefined
  );
}

export default withAuth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Always allow NextAuth routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Public auth pages
  const authPages = new Set(["/login", "/register", "/password-email"]);

  // Areas that require being logged in
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  const isSettings =
    pathname === "/settings" || pathname.startsWith("/settings/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDriverArea =
    pathname === "/driver" || pathname.startsWith("/driver/");

  const authedOnly = isAccount || isSettings || isAdminArea || isDriverArea;

  const isLoggedIn = !!req.auth;
  const role = getRole(req);

  // If logged in, keep them out of auth pages
  if (isLoggedIn && authPages.has(pathname)) {
    return NextResponse.redirect(new URL("/account", nextUrl));
  }

  // If not logged in, redirect from protected areas to login
  if (!isLoggedIn && authedOnly) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Admin-only gate
  if (isAdminArea && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Driver area gate: allow DRIVER or ADMIN
  if (isDriverArea && role !== "DRIVER" && role !== "ADMIN") {
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
