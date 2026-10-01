import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Date Planner",
    short_name: "Date Planner",
    description: "Rencanakan, jalani, dan simpan kenangan setiap kencan.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f9",
    theme_color: "#fbf9f9",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed photo, so Android's own icon mask crops it cleanly.
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/logo-512.webp", sizes: "512x512", type: "image/webp" },
    ],
  }
}
