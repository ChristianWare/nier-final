// One-off: builds public/sitemap-cleanup.xml from the live data files.
// Run from the repo root:  node scripts/generate-cleanup-sitemap.mjs
import { readFileSync, writeFileSync } from "node:fs";

const slugs = (path) =>
  [...readFileSync(path, "utf8").matchAll(/slug:\s*"([^"]+)"/g)].map(
    (m) => m[1],
  );

const services = slugs("src/lib/services.ts"); // 12
const cities = slugs("src/lib/cities.ts"); // 40

const data = readFileSync("src/lib/data.ts", "utf8");
const fleetChunk = data.slice(
  data.indexOf("export const fleetData:"),
  data.indexOf("export const fleetDataii:"),
);
const fleet = [...fleetChunk.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]); // 7

const BASE = "https://www.niertransportation.com";
const today = new Date().toISOString().slice(0, 10);
const urls = [
  ...services.flatMap((s) => cities.map((c) => `${BASE}/services/${s}/${c}`)),
  ...fleet.flatMap((f) => cities.map((c) => `${BASE}/fleet/${f}/${c}`)),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`),
  "</urlset>",
  "",
].join("\n");

writeFileSync("public/sitemap-cleanup.xml", xml);
console.log(
  `Wrote public/sitemap-cleanup.xml with ${urls.length} URLs (expect 760: 12×40 + 7×40).`,
);
