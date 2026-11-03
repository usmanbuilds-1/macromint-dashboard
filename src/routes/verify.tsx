import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmail } from "@/features/auth/VerifyEmail";

export const Route = createFileRoute("/verify")({ component: VerifyEmail });
