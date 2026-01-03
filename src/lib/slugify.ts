export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "") // remove quotes
    .replace(/[^a-z0-9]+/g, "-") // non-alphanum -> dash
    .replace(/-+/g, "-") // collapse
    .replace(/^-|-$/g, ""); // trim dashes
}
