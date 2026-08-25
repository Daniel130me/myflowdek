import { db } from '../src/server/db/client';
import { seedDocumentTemplates } from '../src/server/documents/template-seed.service';

seedDocumentTemplates()
  .then((count) => console.log(`Seeded ${count} document templates.`))
  .catch((error) => {
    console.error('Document template seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());