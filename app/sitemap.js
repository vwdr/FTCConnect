import { SITE_URL } from "@/lib/site";

// Keep the sitemap independent of Supabase so Googlebot can fetch it reliably.
// Team profiles are linked from /teams and can be discovered by crawling that directory.
export default function sitemap() {
  return [
    {
      url: SITE_URL + "/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: SITE_URL + "/teams",
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
