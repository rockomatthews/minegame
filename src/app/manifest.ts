import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MineGame", short_name: "MineGame", description: "Play the MineGame. Don’t lose your mind. Mine it.",
    start_url: "/", display: "standalone", background_color: "#090704", theme_color: "#f6bd3b",
    icons: [{ src: "/assets/minegame-logo.png", sizes: "1254x1254", type: "image/png", purpose: "maskable" }],
  };
}
