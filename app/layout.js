import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FTCConnect | Find FIRST Tech Challenge Teams Near You",
    template: "%s | FTCConnect",
  },
  description:
    "Discover FIRST Tech Challenge (FTC) robotics teams near you. Explore public team listings and connect with the FTC community through FTCConnect.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "FTCConnect | Find FIRST Tech Challenge Teams Near You",
    description:
      "Discover FIRST Tech Challenge robotics teams, browse public team listings, and connect with the FTC community.",
  },
  twitter: {
    card: "summary",
    title: "FTCConnect | Find FIRST Tech Challenge Teams Near You",
    description:
      "Discover FIRST Tech Challenge robotics teams, browse public team listings, and connect with the FTC community.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={\`\${space.variable} \${bebas.variable}\`}>{children}</body>
    </html>
  );
}
