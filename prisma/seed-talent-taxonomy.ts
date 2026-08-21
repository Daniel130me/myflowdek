import { db } from '../src/server/db/client';
import { seedTalentTaxonomy } from '../src/server/talent/taxonomy-seed.service';

seedTalentTaxonomy()
  .then(({ roles, skills }) => {
    console.log(`Seeded ${roles} professional roles and ${skills} skills.`);
  })
  .catch((error) => {
    console.error('Talent taxonomy seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
