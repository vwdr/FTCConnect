import Link from "next/link";
import { getPublicTeams, getTeamLocation } from "@/lib/publicTeams";

export const revalidate = 3600;

export const metadata = {
  title: "New Jersey FTC Team Directory",
  description:
    "Browse New Jersey FIRST Tech Challenge (FTC) robotics teams. Explore public team profiles by team number, name, and location with FTCConnect.",
  alternates: {
    canonical: "/teams",
  },
  openGraph: {
    title: "New Jersey FTC Team Directory | FTCConnect",
    description:
      "Browse public New Jersey FIRST Tech Challenge team listings and discover robotics teams in your community.",
    url: "https://ftcconnect.vercel.app/teams",
    type: "website",
  },
};

export default async function TeamsDirectoryPage() {
  const teams = await getPublicTeams();

  return (
    <main className="directory-page">
      <nav className="directory-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">FTCConnect</Link>
        <span aria-hidden="true">/</span>
        <span>FTC Team Directory</span>
      </nav>

      <header className="directory-header">
        <p className="eyebrow">FTCConnect team directory</p>
        <h1>New Jersey FIRST Tech Challenge Teams</h1>
        <p>
          Explore public FIRST Tech Challenge robotics team listings across New Jersey.
          Find a team's number, learn about its program, and follow its public website or profile.
        </p>
        <p className="directory-count">
          {teams.length} {teams.length === 1 ? "team listing" : "team listings"}
        </p>
      </header>

      {teams.length ? (
        <section className="team-grid" aria-label="New Jersey FTC teams">
          {teams.map((team) => (
            <article className="team-card" key={team.id}>
              <p className="team-card-kicker">FIRST Tech Challenge</p>
              <h2>
                <Link href={\`/teams/\${encodeURIComponent(team.team_number)}\`}>
                  {team.name}
                </Link>
              </h2>
              <p className="team-number">Team #{team.team_number}</p>
              <p className="team-location">{getTeamLocation(team.address)}</p>
              <p className="team-description">{team.description}</p>
              <Link
                className="team-card-link"
                href={\`/teams/\${encodeURIComponent(team.team_number)}\`}
              >
                View team profile
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <p className="directory-empty">
          Team listings are temporarily unavailable. Please return to the homepage and try again.
        </p>
      )}

      <p className="directory-note">
        FTCConnect is an independent community directory and is not an official FIRST website
        or affiliated with FIRST. Team details may change; contact a team directly to confirm
        its current information.
      </p>
    </main>
  );
}
