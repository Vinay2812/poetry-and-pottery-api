import { DATABASE_URL, REPLICA_URL } from "@/consts/env";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readReplicas } from "@prisma/extension-read-replicas";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const connectionString = DATABASE_URL;
const replicaConnectionString = REPLICA_URL ?? connectionString;

const mainAdapter = new PrismaPg({ connectionString });
const replicaAdapter = new PrismaPg({
  connectionString: replicaConnectionString,
});

const replicaClient = new PrismaClient({ adapter: replicaAdapter });

export const prisma = new PrismaClient({ adapter: mainAdapter }).$extends(
  readReplicas({
    replicas: [replicaClient],
  }),
);

export type ExtendedPrismaClient = typeof prisma;
