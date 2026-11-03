import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "@/features/admin/Admin";

export const Route = createFileRoute("/_app/admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin · Platform settings · Macromint" },
      { name: "description", content: "Platform-wide settings for signups, trials and support." },
      { property: "og:title", content: "Admin · Platform settings · Macromint" },
      { property: "og:description", content: "Platform-wide settings for signups, trials and support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return <Admin section="settings" />;
}
