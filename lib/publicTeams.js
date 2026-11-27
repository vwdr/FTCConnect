import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const TEAM_COLUMNS =
  "id, name, team_number, description, address, apply_link, lat, lng, user_id, created_at, updated_at";

export async function getPublicTeams() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("FTCConnect public team lookup failed:", error.message);
    return [];
  }

  const rows = data || [];
  const claimedNumbers = new Set(
    rows.filter((team) => team.user_id).map((team) => String(team.team_number))
  );

  return rows
    .filter((team) => team.user_id || !claimedNumbers.has(String(team.team_number)))
    .map((team) => ({
      ...team,
      lat: Number(team.lat),
      lng: Number(team.lng),
    }))
    .sort((a, b) =>
      String(a.team_number).localeCompare(String(b.team_number), undefined, { numeric: true })
    );
}

export async function getIndexableTeams() {
  const teams = await getPublicTeams();
  // User-submitted listings remain visible in the directory, but are not added to
  // search-engine indexes until FTCConnect has an explicit indexing-consent flow.
  return teams.filter((team) => !team.user_id);
}

export async function getPublicTeamByNumber(teamNumber) {
  const teams = await getPublicTeams();
  return teams.find((team) => String(team.team_number) === String(teamNumber)) || null;
}

export function getTeamLocation(address = "") {
  const parts = String(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const stateIndex = parts.findIndex((part) => /^(New Jersey|NJ)$/i.test(part));
  if (stateIndex === -1) {
    return parts.length > 1 ? parts.slice(-2).join(", ") : parts[0] || "New Jersey";
  }

  if (/^NJ$/i.test(parts[stateIndex])) {
    return \`\${parts[stateIndex - 1] || "New Jersey"}, New Jersey\`;
  }

  if (stateIndex >= 2 && /county$/i.test(parts[stateIndex - 1])) {
    return \`\${parts[stateIndex - 2]}, New Jersey\`;
  }

  if (stateIndex >= 1) {
    return \`\${parts[stateIndex - 1]}, New Jersey\`;
  }

  return "New Jersey";
}

export function getSafeTeamUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)
      ? \`https://\${raw}\`
      : null;

  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
