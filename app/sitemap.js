import { getIndexableTeams } from "@/lib/publicTeams";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap() {
  const teams = await getIndexableTeams();

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: SITE_URL + "/teams",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...teams.map((team) => {
      const lastModified = team.updated_at || team.created_at;
      return {
        url: SITE_URL + "/teams/" + encodeURIComponent(team.team_number),
        ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
        changeFrequency: "monthly",
        priority: 0.7,
      };
    }),
  ];
}
