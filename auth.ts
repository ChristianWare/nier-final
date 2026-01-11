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
      id?: string; // ✅ add canonical id
      roles?: AppRole[];
      // keep temporarily for existing code paths
      userId?: string;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: AppRole[];
    emailVerified?: Date | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },

  callbacks: {
    async jwt({ token }) {
      // Prefer token.sub (user id) when available
      const userId = token.sub;

      const user = userId
        ? await db.user.findUnique({
            where: { id: userId },
            select: { id: true, roles: true, emailVerified: true },
          })
        : token.email
          ? await db.user.findUnique({
              where: { email: token.email },
              select: { id: true, roles: true, emailVerified: true },
            })
          : null;

      if (!user) return token;

      const roles =
        Array.isArray(user.roles) && user.roles.length > 0
          ? (user.roles as unknown as AppRole[])
          : (["USER"] as AppRole[]);

      token.userId = user.id;
      token.roles = roles;
      token.emailVerified = user.emailVerified ?? null;

      return token;
    },

    async session({ session, token }) {
      // ✅ Canonical id
      if (token.userId) {
        session.user.id = token.userId;
        // keep temporarily for backwards-compat
        session.user.userId = token.userId;
      }

      if (token.roles) session.user.roles = token.roles;

      if ("emailVerified" in token) {
        session.user.emailVerified = token.emailVerified ?? null;
      }

      return session;
    },
  },

  pages: { signIn: "/login" },
});
