export interface IdGenerator {
  generate(prefix?: string): string;
}

export const defaultIdGenerator: IdGenerator = {
  generate(prefix = '') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      const uuid = crypto.randomUUID();
      return prefix ? `${prefix}_${uuid}` : uuid;
    }
    const fallback = Math.random().toString(36).slice(2, 11);
    return prefix ? `${prefix}_${fallback}` : fallback;
  },
};
