// Dev-only: creates a test user + session and prints the signed session
// cookie so the flow can be smoke-tested without real OAuth credentials.
import "dotenv/config";
import { createHmac } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const userId = "test-user-1";
  const token = "testsessiontoken-" + Math.random().toString(36).slice(2);

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
    },
  });
  await prisma.session.create({
    data: {
      id: "test-session-" + Date.now(),
      token,
      userId,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      updatedAt: new Date(),
    },
  });

  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update(token)
    .digest("base64");
  console.log(`COOKIE=${encodeURIComponent(`${token}.${signature}`)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
