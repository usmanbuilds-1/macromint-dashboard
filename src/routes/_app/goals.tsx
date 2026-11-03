import { createFileRoute } from "@tanstack/react-router";
import { Goals } from "@/features/goals/Goals";

export const Route = createFileRoute("/_app/goals")({
  head: () => ({
    meta: [
      { title: "Goals · Macromint" },
      { name: "description", content: "Adjust your calorie and macro targets." },
      { property: "og:title", content: "Goals · Macromint" },
      { property: "og:description", content: "Adjust your calorie and macro targets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Goals,
});
