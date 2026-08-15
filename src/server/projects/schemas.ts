import { z } from 'zod';
import {
  PROJECT_NAME_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  DEFAULT_PROJECT_COLOR,
} from './constants';

/** Optional calendar date or ISO timestamp accepted by project forms/APIs. */
const projectDate = z.union([z.iso.date(), z.iso.datetime()]);
const optionalDate = projectDate.optional().nullable();

/** Validation for creating a project. ownerId is NOT accepted from the
 *  browser — it always comes from the authenticated session. */
export const createProjectSchema = z.object({
  name: z.string().trim().min(PROJECT_NAME_MIN_LENGTH, 'Project name is required').max(PROJECT_NAME_MAX_LENGTH),
  description: z.string().trim().max(PROJECT_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
});

/** Template creation uses the same project fields plus a server-known template. */
export const createProjectFromTemplateSchema = createProjectSchema.extend({
  templateId: z.string().trim().min(1, 'Template is required').max(100),
  startDate: projectDate,
  endDate: projectDate,
}).refine(
  ({ startDate, endDate }) => new Date(endDate).getTime() > new Date(startDate).getTime(),
  { message: 'End date must be after start date', path: ['endDate'] },
);

/** Validation for updating a project (all fields optional). */
export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(PROJECT_NAME_MIN_LENGTH, 'Project name cannot be empty')
    .max(PROJECT_NAME_MAX_LENGTH)
    .optional(),
  description: z.string().trim().max(PROJECT_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
});

/** Default values applied on creation when the caller omits them. */
export const PROJECT_DEFAULTS = {
  color: DEFAULT_PROJECT_COLOR,
} as const;

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectFromTemplateInput = z.infer<typeof createProjectFromTemplateSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
