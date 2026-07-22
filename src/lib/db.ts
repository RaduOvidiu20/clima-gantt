import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function cleanConnectionString(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  return raw.trim().replace(/^['"]+|['"]+$/g, "");
}

const connectionString = cleanConnectionString(process.env.DATABASE_URL);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function queryDb<T>(sql: string, params: any[] = []): Promise<T[]> {
  // Prisma doesn't natively accept array spreading for $queryRawUnsafe properly if it contains types it doesn't like, 
  // but it usually works fine for standard types. 
  // Wait, let's just use prisma.$queryRawUnsafe
  return prisma.$queryRawUnsafe<T[]>(sql, ...params);
}

export async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryDb<T>(sql, params);
  return rows[0] ?? null;
}

export async function executeDb(sql: string, params: any[] = []): Promise<void> {
  await prisma.$executeRawUnsafe(sql, ...params);
}

export interface ClientShim {
  query<R = any>(sql: string, params?: any[]): Promise<{ rows: R[] }>;
}

export async function withTransaction<T>(
  callback: (client: ClientShim) => Promise<T>
): Promise<T> {
  // In Prisma, interactive transactions provide a transaction client (tx).
  // The original callback expects an object with a .query() method that returns { rows: [] }.
  return prisma.$transaction(async (tx) => {
    // Create a shim for `client.query`
    const clientShim: ClientShim = {
      query: async <R = any>(sql: string, params: any[] = []): Promise<{ rows: R[] }> => {
        const rows = await tx.$queryRawUnsafe<R[]>(sql, ...params);
        return { rows };
      }
    };
    return callback(clientShim);
  });
}
