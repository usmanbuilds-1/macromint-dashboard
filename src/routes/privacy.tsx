import { createFileRoute } from "@tanstack/react-router";
import { Privacy } from "@/features/landing/Legal";

export const Route = createFileRoute("/privacy")({ component: Privacy });
