import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://minegame.fun", changeFrequency: "weekly", priority: 1 },
    { url: "https://minegame.fun/game", changeFrequency: "monthly", priority: 0.8 },
    { url: "https://minegame.fun/miners", changeFrequency: "monthly", priority: 0.8 },
    { url: "https://minegame.fun/launch", changeFrequency: "weekly", priority: 0.7 },
  ];
}
