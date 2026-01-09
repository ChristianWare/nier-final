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

declare module "next-auth" {
  interface Session {
    user: {
      role?: AppRole;
      userId?: string;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
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
     * We standardize token fields here so middleware & server agree:
     * - token.userId
     * - token.role
     * - token.emailVerified
     */
    async jwt({ token }) {
      if (!token.email) return token;

      const user = await getUserByEmail(token.email);
      if (!user) return token;

      token.userId = user.id;
      token.role = user.role as AppRole;
      token.emailVerified = user.emailVerified ?? null;

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.user.userId = token.userId;
      if (token.role) session.user.role = token.role;
      if ("emailVerified" in token)
        session.user.emailVerified = token.emailVerified ?? null;

      return session;
    },
  },

  pages: { signIn: "/login" },
});
