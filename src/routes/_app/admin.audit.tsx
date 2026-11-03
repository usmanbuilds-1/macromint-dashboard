import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "@/features/admin/Admin";

export const Route = createFileRoute("/_app/admin/audit")({
  head: () => ({
    meta: [
      { title: "Admin · Audit log · Macromint" },
      { name: "description", content: "Every administrative entitlement action, permanently recorded." },
      { property: "og:title", content: "Admin · Audit log · Macromint" },
      { property: "og:description", content: "Every administrative entitlement action, permanently recorded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAuditPage,
});

function AdminAuditPage() {
  return <Admin section="audit" />;
}
