/** Detectează dacă connection string-ul Supabase nu a fost încă completat. */
export function isDbConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return false;
  if (url.includes("[YOUR-PASSWORD]")) return false;
  return true;
}
