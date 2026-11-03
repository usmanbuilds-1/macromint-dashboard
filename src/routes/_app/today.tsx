import { createFileRoute } from "@tanstack/react-router";
import { Today } from "@/features/today/Today";

export const Route = createFileRoute("/_app/today")({
  head: () => ({
    meta: [
      { title: "Today · Macromint" },
      { name: "description", content: "Log meals, scan food and see today's macros against your targets." },
      { property: "og:title", content: "Today · Macromint" },
      { property: "og:description", content: "Log meals, scan food and see today's macros against your targets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
});
