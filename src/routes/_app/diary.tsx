import { createFileRoute } from "@tanstack/react-router";
import { Diary } from "@/features/diary/Diary";

export const Route = createFileRoute("/_app/diary")({
  head: () => ({
    meta: [
      { title: "Diary · Macromint" },
      { name: "description", content: "Browse and edit every logged day, meal by meal." },
      { property: "og:title", content: "Diary · Macromint" },
      { property: "og:description", content: "Browse and edit every logged day, meal by meal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Diary,
});
