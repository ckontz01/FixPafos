import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./design.css";
const body = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
export const metadata: Metadata = {
  title: "PafosLive · Your neighbourhood, on the map",
  description:
    "A public community board for everyday issues in Pafos. Report roads, sewage, waste and other local problems, with suggested responsible services.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
