import { createFileRoute, Link } from "@tanstack/react-router";
import { WeightProgressModule } from "@/features/weight/WeightProgressModule";

export const Route = createFileRoute("/_app/weight")({
  head: () => ({
    meta: [
      { title: "Weight log · Macro Mint" },
      { name: "description", content: "Record weigh-ins, manage your target and review your weight trend." },
    ],
  }),
  component: WeightPage,
});

function WeightPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link to="/trends" className="w-fit text-sm font-medium text-primary underline underline-offset-4">
        Back to trends
      </Link>
      <WeightProgressModule />
    </div>
  );
}
