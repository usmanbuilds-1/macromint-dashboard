import { createFileRoute } from "@tanstack/react-router";
import { Terms } from "@/features/landing/Legal";

export const Route = createFileRoute("/terms")({ component: Terms });
