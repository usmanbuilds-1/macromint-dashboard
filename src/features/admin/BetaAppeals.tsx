import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backend } from "@/lib/backend";
import { publicAccountLabel } from "@/lib/auth/username";
import type { AdminReactivationRequest } from "@/lib/backend/types";
import { toast } from "sonner";

export function BetaAppeals() {
  const [requests, setRequests] = useState<AdminReactivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AdminReactivationRequest | null>(null);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const rows = await backend.adminGetReactivationQueue();
    setRequests(rows);
    setLoading(false);
  };
  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, []);

  const decide = async (approve: boolean) => {
    if (!target || reason.trim().length < 3) return;
    setBusy(true);
    try {
      await backend.adminReviewReactivation(target.id, approve, approve ? days : null, reason.trim());
      await refresh();
      toast.success(approve ? "Tester access extended." : "Request denied.");
      setTarget(null);
      setReason("");
    } catch {
      toast.error("Could not update the request. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 border-b pb-6" aria-labelledby="beta-review-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="beta-review-heading" className="text-base font-semibold">Tester extension requests</h2>
          <p className="mt-1 text-xs text-muted-foreground">Only invited beta testers can receive an extension. Approval is recorded in your audit log.</p>
        </div>
        <Button size="sm" variant="outline" disabled={busy}
          onClick={() => void refresh().catch(() => toast.error("Could not refresh requests"))}>Refresh</Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading requests…</p>}
      {!loading && requests.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
      {requests.map((request) => (
        <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{request.account?.name || publicAccountLabel({ email: request.account?.email })}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(request.createdAt).toLocaleDateString()} · Pending
            </p>
            {request.message && <p className="mt-1 text-sm">{request.message}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={() => { setTarget(request); setReason(""); setDays(7); }}>
            Review
          </Button>
        </div>
      ))}
      {target && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Review request</h3>
          <label className="block space-y-1 text-sm">
            <span>Extension length in days (1–90)</span>
            <Input type="number" min={1} max={90} value={days}
              onChange={(event) => setDays(Number(event.target.value))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Private audit reason (required)</span>
            <Input maxLength={1000} value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for approving or denying" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || reason.trim().length < 3 || !Number.isInteger(days) || days < 1 || days > 90}
              onClick={() => void decide(true)}>{busy ? "Saving…" : "Approve extension"}</Button>
            <Button variant="outline" disabled={busy || reason.trim().length < 3}
              onClick={() => void decide(false)}>Deny</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setTarget(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
