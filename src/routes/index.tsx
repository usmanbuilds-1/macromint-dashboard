import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/features/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Macromint — Precision macro & nutrition tracking" },
      {
        name: "description",
        content:
          "Scan food with AI, log meals in seconds, and watch your macros, weight and trends line up against your targets.",
      },
      { property: "og:title", content: "Macromint — Precision macro & nutrition tracking" },
      {
        property: "og:description",
        content:
          "Scan food with AI, log meals in seconds, and watch your macros, weight and trends line up against your targets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}
