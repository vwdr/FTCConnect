import HomeClient from "@/components/HomeClient";
import { getPublicTeams } from "@/lib/publicTeams";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata = {
  title: "Find FIRST Tech Challenge Teams Near You",
  description:
    "Discover FIRST Tech Challenge (FTC) robotics teams near you. Browse public team listings, explore New Jersey FTC teams, and connect with the robotics community.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FTCConnect | Find FIRST Tech Challenge Teams Near You",
    description:
      "Discover FIRST Tech Challenge robotics teams, browse public team listings, and connect with the FTC community.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function Home() {
  const teams = await getPublicTeams();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": SITE_URL + "/#organization",
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "An independent community directory for discovering and connecting with FIRST Tech Challenge robotics teams.",
      },
      {
        "@type": "WebSite",
        "@id": SITE_URL + "/#website",
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": SITE_URL + "/#organization" },
        inLanguage: "en-US",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomeClient initialTeams={teams} />
    </>
  );
}
