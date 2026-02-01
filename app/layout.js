import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata = {
  title: "FTCConnect",
  description: "Find and connect with FTC teams near you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${space.variable} ${bebas.variable}`}>{children}</body>
    </html>
  );
}
