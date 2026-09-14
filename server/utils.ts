export function escapeSqlString(str: string): string {
  if (typeof str !== 'string') return String(str);
  return str.replace(/'/g, "''");
}
