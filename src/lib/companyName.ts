// src/lib/companyName.ts
//
// The business name printed on generated documents (reports, invoices).
// Blank settings fall back, so a document never says just "Company".

export function companyDisplayName(settings: {
  companyName?: string | null;
  officeName?: string | null;
}): string {
  return (
    settings.companyName?.trim() ||
    settings.officeName?.trim() ||
    process.env.BRAND_NAME?.trim() ||
    "Nier Transportation"
  );
}
