import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://minegame.fun";
const description =
  "Buy virtual miners with MINEGAME, improve their hashrate, and compete for finite, funded MINEGAME rewards on Base.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "MineGame — Play the MineGame", template: "%s | MineGame" },
  description,
  applicationName: "MineGame",
  alternates: { canonical: "/" },
  keywords: ["MineGame", "MINEGAME", "Base", "B20", "mining game", "onchain game"],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "MineGame",
    title: "MineGame — Don’t lose your mind. Mine it.",
    description,
    images: [{ url: "/assets/minegame-logo.png", width: 1254, height: 1254, alt: "Gold MineGame coin with a cartoon miner portrait" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MineGame — Don’t lose your mind. Mine it.",
    description,
    images: ["/assets/minegame-logo.png"],
  },
  category: "game",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090704",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
