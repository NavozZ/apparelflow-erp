
import "dotenv/config";

import { PrismaClient, UserRole } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password-core";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const demoUsers = [
    {
      email: "cutting.supervisor@example.com",
      fullName: "Demo Cutting Supervisor",
      role: UserRole.cutting_supervisor,
      password: process.env.DEMO_CUTTING_SUPERVISOR_PASSWORD,
    },
    {
      email: "cutting.verifier@example.com",
      fullName: "Demo Cutting Verifier",
      role: UserRole.cutting_verifier,
      password: process.env.DEMO_CUTTING_VERIFIER_PASSWORD,
    },
    {
      email: "sewing.supervisor@example.com",
      fullName: "Demo Sewing Supervisor",
      role: UserRole.sewing_supervisor,
      password: process.env.DEMO_SEWING_SUPERVISOR_PASSWORD,
    },
  ];

  // Check all credentials before writing anything.
  for (const user of demoUsers) {
    if (!user.password || user.password.length < 12) {
      throw new Error(`Invalid password configuration for ${user.role}`);
    }
  }

  // Hash every password before starting the transaction.
  const preparedUsers = await Promise.all(
    demoUsers.map(async (user) => ({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      passwordHash: await hashPassword(user.password!),
    }))
  );

  // Create/update all accounts atomically.
  await prisma.$transaction(
    preparedUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        create: user,
        update: {
          fullName: user.fullName,
          role: user.role,
          passwordHash: user.passwordHash,
        },
        select: {
          email: true,
          role: true,
        },
      })
    )
  );

  console.log("Three demo ERP users seeded successfully.");
}

main()
  .catch((error) => {
    console.error(
      "Demo user seeding failed:",
      error instanceof Error ? error.name : "Unknown error"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
