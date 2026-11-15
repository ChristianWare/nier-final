// MapLibre's CSP build (separate worker file) has the same API as the
// default build; its types are the package's own.
declare module "maplibre-gl/dist/maplibre-gl-csp" {
  import maplibregl from "maplibre-gl";
  export default maplibregl;
}
