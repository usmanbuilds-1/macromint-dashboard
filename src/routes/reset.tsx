import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "@/features/auth/ResetPassword";

export const Route = createFileRoute("/reset")({ component: ResetPassword });
