import { PrismaClient } from "@prisma/client";

/**
 * Soft-delete guard for bookings.
 * Every top-level booking read (findMany / findFirst / count / aggregate /
 * groupBy) automatically excludes trashed rows (deletedAt != null) UNLESS
 * the query itself mentions `deletedAt` — which is how the Trash view and
 * the purge cron opt out. findUnique is intentionally NOT filtered so the
 * booking detail page still opens for trashed bookings.
 */
function mentionsDeletedAt(where: unknown): boolean {
  if (!where) return false;
  try {
    return JSON.stringify(where).includes('"deletedAt"');
  } catch {
    return false;
  }
}

function withSoftDelete(client: PrismaClient) {
  return client.$extends({
    name: "bookingSoftDelete",
    query: {
      booking: {
        async findMany({ args, query }) {
          if (!mentionsDeletedAt(args.where))
            args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findFirst({ args, query }) {
          if (!mentionsDeletedAt(args.where))
            args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async count({ args, query }) {
          if (!mentionsDeletedAt(args.where))
            args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async aggregate({ args, query }) {
          if (!mentionsDeletedAt(args.where))
            args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async groupBy({ args, query }) {
          if (!mentionsDeletedAt(args.where))
            args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
      },
    },
  });
}

type Db = ReturnType<typeof withSoftDelete>;

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prismaDb?: Db;
};

const base = globalForPrisma.prismaBase ?? new PrismaClient();
export const db: Db = globalForPrisma.prismaDb ?? withSoftDelete(base);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
  globalForPrisma.prismaDb = db;
}
