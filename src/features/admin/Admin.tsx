import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData, useDataVersion } from "@/hooks/useData";
import { ACCESS_STATES, type AccessState, type AdminUserRow } from "@/types";
import { formatDateShort, todayStr } from "@/lib/nutrition/datetime";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<AccessState, string> = {
  trial_active: "border-primary/40 text-primary",
  paid_active: "border-primary/40 text-primary",
  complimentary: "border-primary/40 text-primary",
  trial_expired: "border-warning/40 text-warning",
  payment_overdue: "border-warning/40 text-warning",
  revoked: "border-destructive/40 text-destructive",
  suspended: "border-destructive/40 text-destructive",
};

function ActionChip({ label, onClick, destructive }: { label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent",
        destructive ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "",
      )}
    >
      {label}
    </button>
  );
}

export function Admin({ section }: { section: "users" | "audit" | "settings" }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Administration</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {section === "users" ? "Users" : section === "audit" ? "Audit log" : "Platform settings"}
          </h1>
        </div>
        <Tabs value={section} onValueChange={() => undefined}>
          <TabsList>
            <TabsTrigger value="users" asChild><Link to="/admin">Users</Link></TabsTrigger>
            <TabsTrigger value="audit" asChild><Link to="/admin/audit">Audit</Link></TabsTrigger>
            <TabsTrigger value="settings" asChild><Link to="/admin/settings">Settings</Link></TabsTrigger>
          </TabsList>
        </Tabs>
      </header>
      {section === "users" && <AdminUsers />}
      {section === "audit" && <AdminAudit />}
      {section === "settings" && <AdminSettings />}
    </div>
  );
}

function StateBadge({ state }: { state: AccessState }) {
  return (
    <Badge variant="outline" className={cn("text-[11px]", STATE_STYLES[state])}>
      {state.replace(/_/g, " ")}
    </Badge>
  );
}

function AdminUsers() {
  const [search, setSearch] = useState("");
  const [noteTarget, setNoteTarget] = useState<AdminUserRow | null>(null);
  const [note, setNote] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const version = useDataVersion();

  const users = useAsyncData(() => backend.adminListUsers(search), [search, version]);

  const act = async (action: string, row: AdminUserRow, extra?: Record<string, unknown>) => {
    try {
      await backend.adminAction({ action, targetUserId: row.userId, reason: extra?.reason as string | undefined, ...extra });
      bumpData();
      toast.success(`${action.replace(/_/g, " ")} applied to ${row.email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="pl-9"
          aria-label="Search users"
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        {users.loading && <p className="px-4 py-4 text-sm text-muted-foreground">Loading users…</p>}
        {users.data?.map((row, idx) => (
          <div key={row.userId} className={cn("flex flex-col px-4 py-3.5", idx > 0 && "border-t")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{row.name || "Unnamed"}</p>
                  {row.entitlement && <StateBadge state={row.entitlement.state} />}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {row.email} · joined {formatDateShort(row.createdAt.slice(0, 10))}
                  {row.entitlement?.state === "trial_active" && ` · trial ends ${formatDateShort(row.entitlement.trialEndsAt.slice(0, 10))}`}
                  {row.diaryCount30d > 0 && ` · ${row.diaryCount30d} entries (30d, last ${formatDateShort(row.lastDiaryDate ?? todayStr())})`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-auto"
                aria-expanded={openRow === row.userId}
                onClick={() => setOpenRow((cur) => (cur === row.userId ? null : row.userId))}
              >
                Actions <ChevronDown className={cn("h-4 w-4 transition-transform", openRow === row.userId && "rotate-180")} />
              </Button>
            </div>
            {openRow === row.userId && (
              <div className="mt-3 flex flex-wrap gap-2 rounded-lg border bg-secondary/40 p-3">
                {row.entitlement?.state !== "paid_active" && (
                  <ActionChip label="Grant paid access" onClick={() => void act("grant_access", row)} />
                )}
                <ActionChip label="Grant complimentary" onClick={() => void act("grant_complimentary", row)} />
                <ActionChip label="Extend trial +7d" onClick={() => void act("extend_trial", row, { days: 7 })} />
                <ActionChip label="Shorten trial −7d" onClick={() => void act("shorten_trial", row, { days: 7 })} />
                <ActionChip label="Suspend" onClick={() => void act("suspend", row)} />
                <ActionChip label="Reactivate" onClick={() => void act("reactivate", row)} />
                <ActionChip label="Revoke access" destructive onClick={() => void act("revoke_access", row)} />
                <ActionChip label="Add internal note" onClick={() => { setNoteTarget(row); setNote(""); }} />
              </div>
            )}
          </div>
        ))}
        {!users.loading && (users.data?.length ?? 0) === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No users match "{search}".</p>
        )}
      </div>

      <Dialog open={Boolean(noteTarget)} onOpenChange={(o) => (!o ? setNoteTarget(null) : undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Internal note — {noteTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="adm-note">Note (recorded in the audit log)</Label>
            <Input id="adm-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!noteTarget) return;
                await act("add_note", noteTarget, { note });
                setNoteTarget(null);
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminAudit() {
  const audit = useAsyncData(() => backend.adminGetAudit(), []);
  const entries = audit.data ?? [];
  return (
    <div className="overflow-hidden rounded-xl border">
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No administrative actions recorded yet. Every entitlement change, from grants to revocations, is appended here permanently.
        </p>
      ) : (
        entries.map((e, idx) => (
          <div key={e.id} className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3", idx > 0 && "border-t")}>
            <div className="min-w-0">
              <p className="text-sm font-medium">{e.action.replace(/_/g, " ")}</p>
              <p className="truncate text-xs text-muted-foreground">
                user {e.targetUserId.slice(0, 8)}… · admin {e.adminId.slice(0, 8)}…
                {e.previousState && e.previousState !== e.newState ? ` · ${e.previousState} → ${e.newState ?? "—"}` : ""}
                {e.reason ? ` · "${e.reason}"` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function AdminSettings() {
  const settings = useAsyncData(() => backend.adminGetSettings(), []);
  const [trialDays, setTrialDays] = useState("");
  const [rewardHours, setRewardHours] = useState("");
  const [maxAds, setMaxAds] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setTrialDays(String(settings.data.trialDays));
      setRewardHours(String(settings.data.rewardAccessHours));
      setMaxAds(String(settings.data.maxDailyRewardedAds));
    }
  }, [settings.data]);

  const save = async () => {
    setBusy(true);
    try {
      await backend.adminAction({ action: "set_trial_days", days: Number(trialDays) });
      await backend.adminAction({ action: "set_reward_config", days: Number(rewardHours), date: maxAds });
      bumpData();
      toast.success("Platform settings updated. New signups get the new trial length.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Free trial</h2>
        <p className="mt-1 text-xs text-muted-foreground">Configurable without touching code. Existing trials are unaffected.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="grid w-32 gap-1.5">
            <Label htmlFor="as-trial">Trial days (0–90)</Label>
            <Input id="as-trial" inputMode="numeric" value={trialDays} onChange={(e) => setTrialDays(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Rewarded advertising</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Access granted per verified ad view. Requires a configured provider (see docs/MONETIZATION.md); until then rewards are disabled and shown as unavailable.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="grid w-40 gap-1.5">
            <Label htmlFor="as-hours">Access hours per ad</Label>
            <Input id="as-hours" inputMode="numeric" value={rewardHours} onChange={(e) => setRewardHours(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="grid w-40 gap-1.5">
            <Label htmlFor="as-ads">Max ads per day</Label>
            <Input id="as-ads" inputMode="numeric" value={maxAds} onChange={(e) => setMaxAds(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={busy} className="self-start">
        {busy ? "Saving…" : "Save platform settings"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Access states in use: {ACCESS_STATES.map((s) => s.replace(/_/g, " ")).join(", ")}.
      </p>
    </div>
  );
}
