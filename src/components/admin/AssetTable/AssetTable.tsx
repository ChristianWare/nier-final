"use client";

import { useRef, useState } from "react";
import type { AssetFile } from "@/components/admin/assets/assetUtils";
import { formatSize } from "@/components/admin/assets/assetUtils";
import styles from "./AssetTable.module.css";

type Props = {
  assets: AssetFile[];
  type: "image" | "video";
};

type PreviewState = {
  src: string;
  top: number;
  left: number;
  visible: boolean;
};

export default function AssetTable({ assets, type }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<PreviewState>({
    src: "",
    top: 0,
    left: 0,
    visible: false,
  });

  function handleMouseEnter(
    e: React.MouseEvent<HTMLDivElement>,
    publicPath: string
  ) {
    const row = e.currentTarget;
    const table = tableRef.current;
    if (!table) return;

    const rowRect = row.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();

    // Position above the row, relative to the table container
    const top = rowRect.top - tableRect.top - 200 - 12; // 200px height + 12px gap
    const left = rowRect.left - tableRect.left;

    setPreview({ src: publicPath, top, left, visible: true });
  }

  function handleMouseLeave() {
    setPreview((prev) => ({ ...prev, visible: false }));
  }

  return (
    <div className={styles.tableWrapper} ref={tableRef}>
      {/* Hover preview — single shared element, positioned absolutely */}
      {preview.visible && preview.src && (
        <div
          className={styles.hoverPreview}
          style={{ top: preview.top, left: preview.left }}
        >
          {type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.src} alt="Preview" className={styles.previewImg} />
          ) : (
            <video
              src={preview.src}
              className={styles.previewImg}
              muted
              preload="metadata"
            />
          )}
        </div>
      )}

      {/* Table header */}
      <div className={styles.tableHeader}>
        <span className={styles.colName}>File Name</span>
        <span className={styles.colSize}>Size</span>
        <span className={styles.colType}>Type</span>
        <span className={styles.colAction}></span>
      </div>

      {/* Rows */}
      <div className={styles.tableBody}>
        {assets.map((asset) => (
          <div
            key={asset.name}
            className={styles.tableRow}
            onMouseEnter={(e) => handleMouseEnter(e, asset.publicPath)}
            onMouseLeave={handleMouseLeave}
          >
            <span className={styles.colName}>
              <span className={styles.fileName}>{asset.name}</span>
            </span>
            <span className={styles.colSize}>{formatSize(asset.sizeKb)}</span>
            <span className={styles.colType}>
              <span className="badge badge_accent">
                {asset.ext.replace(".", "").toUpperCase()}
              </span>
            </span>
            <span className={styles.colAction}>
              <a
                href={asset.publicPath}
                download={asset.name}
                className={styles.downloadLink}
              >
                Download
              </a>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}