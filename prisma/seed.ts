// Seeds the region. Players are created per user by the welcome flow.
// Run with: bun run db:seed
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureRegion } from "../src/lib/game/defaultPlayer";
import { REGION } from "../src/lib/game/gameConfig";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await ensureRegion(prisma);
  console.log(`Seeded region ${REGION.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
