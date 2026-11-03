import { createFileRoute } from "@tanstack/react-router";
import { Trends } from "@/features/trends/Trends";

export const Route = createFileRoute("/_app/trends")({
  head: () => ({
    meta: [
      { title: "Trends · Macromint" },
      { name: "description", content: "Weekly calorie adherence, weight trend and macro splits." },
      { property: "og:title", content: "Trends · Macromint" },
      { property: "og:description", content: "Weekly calorie adherence, weight trend and macro splits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trends,
});
