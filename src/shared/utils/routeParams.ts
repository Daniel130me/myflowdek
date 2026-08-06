export function getSingleParam(
  value: string | string[] | undefined
): string {
  return typeof value === 'string' ? value : value?.[0] ?? '';
}
