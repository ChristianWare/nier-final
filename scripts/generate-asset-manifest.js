const fs = require("fs");
const path = require("path");

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".ogg", ".avi", ".mkv"];
const IMAGE_CATEGORIES = ["areas", "other", "people", "vehicles", "logos"];

function readAssets(subfolder, validExts) {
  const dir = path.join(process.cwd(), "public", subfolder);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return validExts.includes(ext) && !file.startsWith(".");
    })
    .map((file) => {
      const ext = path.extname(file).toLowerCase();
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        publicPath: `/${subfolder}/${file}`,
        ext,
        sizeKb: Math.round(stats.size / 1024),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const manifest = {
  categories: IMAGE_CATEGORIES.map((name) => ({
    name,
    assets: readAssets(`images/${name}`, IMAGE_EXTENSIONS),
  })),
  videos: readAssets("videos", VIDEO_EXTENSIONS),
};

const outDir = path.join(process.cwd(), "src", "generated");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "asset-manifest.json"),
  JSON.stringify(manifest, null, 2),
);

console.log("✓ Asset manifest generated");
