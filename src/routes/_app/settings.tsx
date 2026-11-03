import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/features/settings/Settings";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Macromint" },
      { name: "description", content: "Account, preferences, privacy controls and sign out." },
      { property: "og:title", content: "Settings · Macromint" },
      { property: "og:description", content: "Account, preferences, privacy controls and sign out." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});
