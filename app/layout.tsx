import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cluck-and-Cover_GPT | Farmer Skip's Farmyard Arcade Run",
  description:
    "Help grumpy old Farmer Skip rescue his hens and eggs across ten hand-drawn farmyards, two boss battles, and one very bad morning.",
  metadataBase: new URL("https://cluck-and-covergpt.vercel.app"),
  openGraph: {
    title: "Cluck-and-Cover_GPT",
    description: "Ten yards. Two bosses. One grumpy old farmer with a fistful of corn.",
    type: "website",
    images: [{ url: "/og.png", width: 1664, height: 936, alt: "Farmer Skip faces King Coil in Cluck-and-Cover_GPT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cluck-and-Cover_GPT",
    description: "A farmyard arcade run starring the one and only Farmer Skip.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
