/* eslint-disable @typescript-eslint/no-explicit-any */
// auth.config.ts
import type { NextAuthConfig } from "next-auth";

type AppRole = "USER" | "ADMIN" | "DRIVER";

const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const id = (user as any).id as string | undefined;
        token.userId = id;

        const rolesFromUser = (user as any).roles as AppRole[] | undefined;

        token.roles =
          Array.isArray(rolesFromUser) && rolesFromUser.length > 0
            ? rolesFromUser
            : (["USER"] as AppRole[]);

        token.emailVerified = (user as any).emailVerified ?? null;
      }

      return token;
    },

    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      const roleOwnedPrefixes = [
        "/admin",
        "/driver-dashboard",
        "/corporate",
        "/dashboard",
      ];
      try {
        const { pathname } = new URL(url);
        if (roleOwnedPrefixes.some((p) => pathname.startsWith(p))) {
          return baseUrl;
        }
      } catch {}
      return url.startsWith(baseUrl) ? url : baseUrl;
    },

    /**
     * Middleware-safe session callback:
     * - Ensures session.user includes our standardized fields
     */
    async session({ session, token }) {
      const userId = (token as any).userId as string | undefined;
      const roles = (token as any).roles as AppRole[] | undefined;

      (session.user as any) = {
        ...session.user,
        id: userId,
        userId,
        roles,
        emailVerified: (token as any).emailVerified ?? null,
      };

      return session;
    },

    // Optional: gate credentials users until verified
    // async signIn({ user, account }) {
    //   if (account?.provider === "credentials") {
    //     if (!(user as any)?.emailVerified) return "/email-verification?notice=verify";
    //   }
    //   return true;
    // },
  },
} satisfies NextAuthConfig;

export default authConfig;
