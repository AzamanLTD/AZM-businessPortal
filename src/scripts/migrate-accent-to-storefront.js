// One-time migration: copies BusinessProfile.adAccentColor into each
// business's published storefront theme tokenSet.accent.
// Usage: node src/scripts/migrate-accent-to-storefront.js (from backend root)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting accent-color migration to storefront themes...\n');
  const businesses = await prisma.businessProfile.findMany({
    where: { adAccentColor: { not: null } },
    select: { id: true, adAccentColor: true, businessName: true },
  });
  console.log(`Found ${businesses.length} businesses with accent colors set.`);
  let updated = 0;
  for (const biz of businesses) {
    const layout = await prisma.businessStorefrontLayout.findFirst({
      where: { businessProfileId: biz.id, status: 'PUBLISHED' },
      select: { id: true, themeId: true },
    });
    if (!layout?.themeId) { console.log(`  ⚠ ${biz.businessName}: no published layout/theme — skipping`); continue; }
    const theme = await prisma.businessStorefrontTheme.findUnique({ where: { id: layout.themeId }, select: { id: true, tokenSet: true } });
    if (!theme) { console.log(`  ⚠ ${biz.businessName}: theme not found — skipping`); continue; }
    await prisma.businessStorefrontTheme.update({ where: { id: theme.id }, data: { tokenSet: { ...(theme.tokenSet || {}), accent: biz.adAccentColor } } });
    console.log(`  ✓ ${biz.businessName}: accent set to ${biz.adAccentColor}`);
    updated++;
  }
  console.log(`\nMigration complete. ${updated} theme(s) updated.`);
  await prisma.$disconnect();
}
migrate().catch((err) => { console.error('Migration failed:', err); prisma.$disconnect(); process.exit(1); });
