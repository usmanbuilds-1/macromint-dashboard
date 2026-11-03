import { createFileRoute } from "@tanstack/react-router";
import { Upgrade } from "@/features/upgrade/Upgrade";

export const Route = createFileRoute("/upgrade")({ component: Upgrade });
