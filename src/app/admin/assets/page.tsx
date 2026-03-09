/* eslint-disable @typescript-eslint/no-unused-vars */
import styles from "./AssetsPage.module.css";
import fs from "fs";
import path from "path";
import type { AssetFile } from "@/components/admin/assets/assetUtils";
import { formatSize, capitalize } from "@/components/admin/assets/assetUtils";
import AssetTable from "@/components/admin/AssetTable/AssetTable";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

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
const IMAGE_CATEGORIES = [
  "areas",
  "other",
  "people",
  "vehicles",
  "logos",
] as const;

type ImageCategory = {
  name: string;
  assets: AssetFile[];
};

function readAssets(subfolder: string, validExts: string[]): AssetFile[] {
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

function readImageCategories(): ImageCategory[] {
  return IMAGE_CATEGORIES.map((category) => ({
    name: category,
    assets: readAssets(`images/${category}`, IMAGE_EXTENSIONS),
  }));
}

// export { formatSize, capitalize };

export default function AdminAssetsPage() {
  const categories = readImageCategories();
  const totalImages = categories.reduce((sum, c) => sum + c.assets.length, 0);
  const videos = readAssets("videos", VIDEO_EXTENSIONS);

  return (
    <section className={styles.container}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.top}>
          <div>
            <h1 className={`${styles.heading} h2 underline`}>Assets</h1>
            <p className={styles.tagline}>
              Images and videos from your public folder
            </p>
            <div className={styles.badgesRow}>
              <span className='badge badge_accent'>
                {totalImages} image{totalImages !== 1 ? "s" : ""}
              </span>
              {categories.map((cat) => (
                <span key={cat.name} className='badge badge_good'>
                  {cat.assets.length} {cat.name}
                </span>
              ))}
              <span className='badge badge_accent'>
                {videos.length} video{videos.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Images by Category ── */}
      {categories.map((category) => (
        <div key={category.name} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h3'>{capitalize(category.name)}</h2>
            <p className='miniNote'>
              /public/images/{category.name} &mdash; {category.assets.length}{" "}
              file{category.assets.length !== 1 ? "s" : ""}
            </p>
          </div>

          {category.assets.length === 0 ? (
            <div className={styles.empty}>
              <p>
                No images found in <code>/public/images/{category.name}</code>.
              </p>
            </div>
          ) : (
            <AssetTable assets={category.assets} type='image' />
          )}
        </div>
      ))}

      {/* ── Videos ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h3'>Videos</h2>
          <p className='miniNote'>
            /public/videos &mdash; {videos.length} file
            {videos.length !== 1 ? "s" : ""}
          </p>
        </div>

        {videos.length === 0 ? (
          <div className={styles.empty}>
            <p>
              No videos found in <code>/public/videos</code>.
            </p>
          </div>
        ) : (
          <AssetTable assets={videos} type='video' />
        )}
      </div>
    </section>
  );
}
