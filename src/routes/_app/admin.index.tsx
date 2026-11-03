import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "@/features/admin/Admin";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({
    meta: [
      { title: "Admin · Users · Macromint" },
      { name: "description", content: "Manage users, entitlements and platform settings." },
      { property: "og:title", content: "Admin · Users · Macromint" },
      { property: "og:description", content: "Manage users, entitlements and platform settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return <Admin section="users" />;
}
