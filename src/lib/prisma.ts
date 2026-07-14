import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL || 'postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  prismaInstance = new PrismaClient({
    adapter,
    log: ['query'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
}

function getCurrentUser(): string {
  try {
    const { cookies } = require('next/headers');
    const cookieStore = cookies();
    const userCookie = cookieStore.get('marcela_finance_user');
    return userCookie?.value || 'demo';
  } catch (e) {
    return 'demo';
  }
}

const extendedPrisma = prismaInstance.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
      async findUnique({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return (query as any)(args);
      },
      async create({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).data = { ...(args as any).data, user };
        return query(args);
      },
      async update({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
      async updateMany({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
      async delete({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
      async deleteMany({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
      async count({ model, operation, args, query }) {
        const user = getCurrentUser();
        (args as any).where = { ...(args as any).where, user };
        return query(args);
      },
    },
  },
});

export const prisma = extendedPrisma as unknown as PrismaClient;
export default prisma;
