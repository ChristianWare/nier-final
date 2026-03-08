export type AssetFile = {
  name: string;
  publicPath: string;
  ext: string;
  sizeKb: number;
};

export function formatSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
