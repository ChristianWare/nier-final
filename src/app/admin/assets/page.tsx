import styles from "./AssetsPage.module.css";
import manifest from "@/generated/asset-manifest.json";
import type { AssetFile } from "@/components/admin/assets/assetUtils";
import { capitalize } from "@/components/admin/assets/assetUtils";
import AssetTable from "@/components/admin/AssetTable/AssetTable";

const categories = manifest.categories as {
  name: string;
  assets: AssetFile[];
}[];
const videos = manifest.videos as AssetFile[];
const totalImages = categories.reduce((sum, c) => sum + c.assets.length, 0);

export default function AdminAssetsPage() {
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
