import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: "https://minegame.fun/sitemap.xml", host: "https://minegame.fun" };
}
