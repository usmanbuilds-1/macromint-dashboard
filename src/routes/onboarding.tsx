import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { useSession } from "@/context/Session";

export const Route = createFileRoute("/onboarding")({ component: OnboardingRoute });

function OnboardingRoute() {
  const { loading, user, profile } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/login", replace: true });
    else if (profile?.onboardedAt) void navigate({ to: "/today", replace: true });
  }, [loading, user, profile, navigate]);
  if (loading || !user || !profile || profile.onboardedAt) return <p className="p-8">Loading Macromint</p>;
  return <Onboarding />;
}
