/* eslint-disable @typescript-eslint/no-unused-vars */
// auth.ts
import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import authConfig from "./auth.config";
import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/user";
import { LoginSchema } from "@/schemas/LoginSchema";
import bcryptjs from "bcryptjs";

export type AppRole = "USER" | "ADMIN" | "DRIVER";

function derivePrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  return "USER";
}

declare module "next-auth" {
  interface Session {
    user: {
      // ✅ new
      roles?: AppRole[];

      // ✅ keep for backwards compatibility while you migrate checks
      role?: AppRole;

      userId?: string;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // ✅ new
    roles?: AppRole[];

    // ✅ keep for backwards compatibility
    role?: AppRole;

    userId?: string;
    emailVerified?: Date | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Light options (used by middleware) first
  ...authConfig,

  // Heavy options (Node runtime)
  adapter: PrismaAdapter(db),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      name: "Credentials",
      authorize: async (credentials) => {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await getUserByEmail(email);
        if (!user || !user.password) return null;

        const isCorrectPassword = await bcryptjs.compare(
          password,
          user.password
        );
        return isCorrectPassword ? user : null;
      },
    }),
  ],

  events: {
    async linkAccount({ user }) {
      // When Google is linked, mark verified
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },

  callbacks: {
    /**
     * Server-side JWT callback (Node runtime) — allowed to hit the DB.
     * Standardize token fields:
     * - token.userId
     * - token.roles
     * - token.role (derived primary for compatibility)
     * - token.emailVerified
     */
    async jwt({ token }) {
      if (!token.email) return token;

      // Pull both during transition (role + roles)
      const user = await db.user.findUnique({
        where: { email: token.email },
        select: {
          id: true,
          role: true,
          roles: true,
          emailVerified: true,
        },
      });

      if (!user) return token;

      const roles =
        user.roles && user.roles.length > 0
          ? (user.roles as unknown as AppRole[])
          : ([user.role] as unknown as AppRole[]);

      token.userId = user.id;
      token.roles = roles;
      token.role = derivePrimaryRole(roles);
      token.emailVerified = user.emailVerified ?? null;

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.user.userId = token.userId;

      if (token.roles) session.user.roles = token.roles;
      if (token.role) session.user.role = token.role;

      if ("emailVerified" in token) {
        session.user.emailVerified = token.emailVerified ?? null;
      }

      return session;
    },
  },

  pages: { signIn: "/login" },
});
