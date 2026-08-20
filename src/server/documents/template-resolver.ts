import type { StructuredTemplateContent, TemplateResolutionContext } from './types';

const MISSING_VALUE = 'Not provided';

function formatDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : MISSING_VALUE;
}

/** Resolve supported project variables without evaluating arbitrary expressions. */
export function resolveTemplateVariables(
  content: StructuredTemplateContent,
  context: TemplateResolutionContext,
): StructuredTemplateContent {
  const values: Record<string, string> = {
    'project.name': context.project.name || MISSING_VALUE,
    'project.description': context.project.description || 'Add the project description here.',
    'project.startDate': formatDate(context.project.startDate),
    'project.endDate': formatDate(context.project.endDate),
    'project.manager.name': context.project.manager.name || MISSING_VALUE,
    'project.manager.email': context.project.manager.email || MISSING_VALUE,
    'workspace.name': context.workspace.name || MISSING_VALUE,
    currentDate: (context.currentDate ?? new Date()).toISOString().slice(0, 10),
  };

  const resolve = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, key: string) => {
        return values[key] ?? `[${key}: not available yet]`;
      });
    }
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, resolve(entry)]),
      );
    }
    return value;
  };

  return resolve(content) as StructuredTemplateContent;
}