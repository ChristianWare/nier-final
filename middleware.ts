/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "./auth.config";

export const { auth: withAuth } = NextAuth(authConfig);

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getRole(req: any): AppRole | undefined {
  return (
    req?.auth?.user?.role ??
    req?.auth?.role ??
    req?.auth?.token?.role ??
    undefined
  );
}

function roleHome(role?: AppRole) {
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
  const role = getRole(req);

  if (isLoggedIn && authPages.has(pathname)) {
    return NextResponse.redirect(new URL(roleHome(role), nextUrl));
  }

  if (!isLoggedIn && authedOnly) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminArea && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isDriverDashboard && role !== "DRIVER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isUserDashboard && role !== "USER" && role !== "ADMIN") {
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
