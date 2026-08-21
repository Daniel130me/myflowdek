import { db } from '@/server/db/client';
import { PROFESSIONAL_ROLES, PROFESSIONAL_SKILLS, toTaxonomySlug } from './taxonomy';

/** Seed the shared competency taxonomy. Stable slugs make repeated runs safe. */
export async function seedTalentTaxonomy(): Promise<{ roles: number; skills: number }> {
  await db.$transaction([
    ...PROFESSIONAL_ROLES.map((name, sortOrder) => {
      const slug = toTaxonomySlug(name);
      return db.professionalRole.upsert({
        where: { slug },
        create: { slug, name, sortOrder },
        update: { name, sortOrder, isActive: true },
      });
    }),
    ...PROFESSIONAL_SKILLS.map(({ name, category }, sortOrder) => {
      const slug = toTaxonomySlug(name);
      return db.skill.upsert({
        where: { slug },
        create: { slug, name, category, sortOrder },
        update: { name, category, sortOrder, isActive: true },
      });
    }),
  ]);

  return { roles: PROFESSIONAL_ROLES.length, skills: PROFESSIONAL_SKILLS.length };
}
