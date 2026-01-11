/* eslint-disable @typescript-eslint/no-explicit-any */
// auth.config.ts
import type { NextAuthConfig } from "next-auth";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function derivePrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  return "USER";
}

const authConfig = {
  providers: [], // required by the type (real providers are in auth.ts)
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },

  callbacks: {
    /**
     * Middleware-safe JWT callback:
     * - Runs in Edge runtime (no DB)
     * - Only copies info from `user` when it exists (sign-in / sign-up)
     * - Keeps token fields consistent across the app
     */
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id;

        // ✅ Multi-role support (preferred)
        const rolesFromUser = (user as any).roles as AppRole[] | undefined;
        const roleFromUser =
          ((user as any).role as AppRole | undefined) ?? "USER";

        const roles: AppRole[] =
          Array.isArray(rolesFromUser) && rolesFromUser.length > 0
            ? rolesFromUser
            : [roleFromUser];

        token.roles = roles;

        // ✅ Backwards compatibility (single "primary" role)
        token.role = derivePrimaryRole(roles);

        token.emailVerified = (user as any).emailVerified ?? null;
      }

      return token;
    },

    /**
     * Middleware-safe session callback:
     * - Ensures session.user includes our standardized fields
     */
    async session({ session, token }) {
      const roles =
        ((token as any).roles as AppRole[] | undefined) ?? undefined;

      (session.user as any) = {
        ...session.user,
        userId: (token as any).userId,
        roles, // ✅ new
        role: (token as any).role ?? "USER", // ✅ keep compatibility
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
