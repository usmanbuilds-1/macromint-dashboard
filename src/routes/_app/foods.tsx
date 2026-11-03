import { createFileRoute } from "@tanstack/react-router";
import { Foods } from "@/features/foods/Foods";

export const Route = createFileRoute("/_app/foods")({
  head: () => ({
    meta: [
      { title: "Foods · Macromint" },
      { name: "description", content: "Your custom foods, recipes and favorites." },
      { property: "og:title", content: "Foods · Macromint" },
      { property: "og:description", content: "Your custom foods, recipes and favorites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Foods,
});
