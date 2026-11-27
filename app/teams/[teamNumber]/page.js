import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicTeamByNumber,
  getSafeTeamUrl,
  getTeamLocation,
} from "@/lib/publicTeams";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

async function getTeam(params) {
  const { teamNumber } = await params;
  return getPublicTeamByNumber(teamNumber);
}

export async function generateMetadata({ params }) {
  const team = await getTeam(params);

  if (!team) {
    return {
      title: "FTC Team Not Found",
      robots: { index: false, follow: false },
    };
  }

  const location = getTeamLocation(team.address);
  const description =
    team.name +
    " is FIRST Tech Challenge robotics team #" +
    team.team_number +
    ", based in " +
    location +
    ". Explore its public team profile on FTCConnect.";

  return {
    title: "FTC Team #" + team.team_number + ": " + team.name,
    description,
    alternates: {
      canonical: "/teams/" + encodeURIComponent(team.team_number),
    },
    robots: team.user_id
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: team.name + " (#" + team.team_number + ") | FTCConnect",
      description,
      url: SITE_URL + "/teams/" + encodeURIComponent(team.team_number),
      type: "profile",
    },
  };
}

export default async function TeamProfilePage({ params }) {
  const team = await getTeam(params);
  if (!team) notFound();

  const location = getTeamLocation(team.address);
  const teamUrl = getSafeTeamUrl(team.apply_link);
  const pageUrl = SITE_URL + "/teams/" + encodeURIComponent(team.team_number);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: team.name + " (FIRST Tech Challenge Team #" + team.team_number + ")",
    description: team.description,
    url: pageUrl,
    address: {
      "@type": "PostalAddress",
      addressRegion: "New Jersey",
      addressCountry: "US",
    },
    ...(teamUrl ? { sameAs: [teamUrl] } : {}),
  };

  return (
    <main className="directory-page team-profile-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <nav className="directory-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">FTCConnect</Link>
        <span aria-hidden="true">/</span>
        <Link href="/teams">FTC Team Directory</Link>
        <span aria-hidden="true">/</span>
        <span>Team #{team.team_number}</span>
      </nav>

      <header className="directory-header team-profile-header">
        <p className="eyebrow">FIRST Tech Challenge team profile</p>
        <h1>{team.name}</h1>
        <p className="team-profile-number">Team #{team.team_number}</p>
        <p className="team-location">{location}</p>
      </header>

      <section className="team-profile-card" aria-labelledby="about-team-heading">
        <h2 id="about-team-heading">About {team.name}</h2>
        <p>{team.description}</p>
        {teamUrl ? (
          <a className="btn primary" href={teamUrl} target="_blank" rel="noopener noreferrer">
            Visit team website or public profile
          </a>
        ) : null}
      </section>

      <p className="directory-note">
        This listing is provided for community discovery. FTCConnect is an independent directory
        and is not an official FIRST website or affiliated with FIRST. Confirm current team details
        directly with the team.
      </p>

      <Link className="directory-back-link" href="/teams">
        Browse all New Jersey FTC teams
      </Link>
    </main>
  );
}
