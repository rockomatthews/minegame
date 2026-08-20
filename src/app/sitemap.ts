import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://minegame.fun", changeFrequency: "weekly", priority: 1 }];
}
