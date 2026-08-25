import type { ProjectDocumentPhase } from '@prisma/client';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { seedDocumentTemplates } from './template-seed.service';

const templateSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  phase: true,
  documentType: true,
  content: true,
  thumbnailUrl: true,
  tags: true,
  version: true,
  updatedAt: true,
} as const;

export interface ListTemplateOptions {
  phase?: ProjectDocumentPhase;
  search?: string;
}

function templateWhere(options: ListTemplateOptions) {
  return {
    isPublished: true,
    ...(options.phase ? { phase: options.phase } : {}),
    ...(options.search?.trim()
      ? {
          OR: [
            { name: { contains: options.search.trim(), mode: 'insensitive' as const } },
            { description: { contains: options.search.trim(), mode: 'insensitive' as const } },
            { tags: { has: options.search.trim().toLowerCase() } },
          ],
        }
      : {}),
  };
}

/** List published templates, seeding only when a fresh database is empty. */
export async function listDocumentTemplates(options: ListTemplateOptions = {}) {
  const templates = await db.documentTemplate.findMany({
    where: templateWhere(options),
    select: templateSelect,
    orderBy: [{ phase: 'asc' }, { name: 'asc' }],
  });
  if (templates.length > 0 || options.search) return templates;

  const anyTemplate = await db.documentTemplate.findFirst({ select: { id: true } });
  if (anyTemplate) return templates;

  await seedDocumentTemplates();
  return db.documentTemplate.findMany({
    where: templateWhere(options),
    select: templateSelect,
    orderBy: [{ phase: 'asc' }, { name: 'asc' }],
  });
}

/** Retrieve one published template by id or stable slug. */
export async function getDocumentTemplate(idOrSlug: string) {
  let template = await db.documentTemplate.findFirst({
    where: {
      isPublished: true,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: templateSelect,
  });
  if (!template) {
    const anyTemplate = await db.documentTemplate.findFirst({ select: { id: true } });
    if (!anyTemplate) {
      await seedDocumentTemplates();
      template = await db.documentTemplate.findFirst({
        where: { isPublished: true, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
        select: templateSelect,
      });
    }
  }
  if (!template) throw new AuthError('Document template not found', 404);
  return template;
}