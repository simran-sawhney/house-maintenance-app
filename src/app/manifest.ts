import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Our Home",
    short_name: "Home",
    description: "Your family's shared household command centre.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#f6f5f2",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
