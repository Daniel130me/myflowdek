import { Prisma } from '@prisma/client';
import { db } from '@/server/db/client';
import { DOCUMENT_TEMPLATE_CATALOG } from './template-catalog';

/** Upsert Flowdek-owned templates by stable slug. Safe to run repeatedly. */
export async function seedDocumentTemplates(): Promise<number> {
  await db.$transaction(
    DOCUMENT_TEMPLATE_CATALOG.map((template) =>
      db.documentTemplate.upsert({
        where: { slug: template.slug },
        create: {
          slug: template.slug,
          name: template.name,
          description: template.description,
          phase: template.phase,
          documentType: template.documentType,
          content: template.content as unknown as Prisma.InputJsonValue,
          thumbnailUrl: template.thumbnailUrl ?? null,
          tags: template.tags,
          version: template.version,
          isPublished: true,
        },
        update: {
          name: template.name,
          description: template.description,
          phase: template.phase,
          documentType: template.documentType,
          content: template.content as unknown as Prisma.InputJsonValue,
          thumbnailUrl: template.thumbnailUrl ?? null,
          tags: template.tags,
          version: template.version,
          isPublished: true,
        },
      }),
    ),
  );
  return DOCUMENT_TEMPLATE_CATALOG.length;
}