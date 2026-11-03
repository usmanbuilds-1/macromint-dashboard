import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

// Passthrough layout: /admin/audit and /admin/settings are separate pages.
function AdminLayout() {
  return <Outlet />;
}
