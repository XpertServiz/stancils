import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./db-url";

const g = globalThis as unknown as { prisma?: PrismaClient };

export const db = g.prisma ?? new PrismaClient({ log: ["error"], datasourceUrl: databaseUrl() });
if (process.env.NODE_ENV !== "production") g.prisma = db;

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
