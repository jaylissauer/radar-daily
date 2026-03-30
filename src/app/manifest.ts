import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Radar Daily",
    short_name: "Radar Daily",
    description: "Daily AI product and platform intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#020611",
    theme_color: "#10245e",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
