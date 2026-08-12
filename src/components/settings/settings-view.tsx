"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, SectionTitle, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import {
  signOut,
  updateHouseholdName,
  updateDisplayName,
  createStore,
  setStoreActive,
  createTaskCategory,
} from "@/actions/settings";
import type { Store, TaskCategory } from "@/types/db";

type Member = { userId: string; name: string; role: string; isYou: boolean };

export function SettingsView({
  householdName,
  displayName,
  isAdmin,
  members,
  stores,
  categories,
}: {
  householdName: string;
  displayName: string;
  isAdmin: boolean;
  members: Member[];
  stores: Store[];
  categories: TaskCategory[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState(displayName);
  const [hName, setHName] = React.useState(householdName);
  const [newStore, setNewStore] = React.useState("");
  const [newCat, setNewCat] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<{ ok: boolean; message?: string }>, ok: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    toast({ message: res.ok ? ok : res.message ?? "Something went wrong." });
    if (res.ok) router.refresh();
    return res.ok;
  }

  return (
    <div className="space-y-7">
      {/* Your name */}
      <section className="space-y-2">
        <SectionTitle>Your name</SectionTitle>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            variant="secondary"
            onClick={() => run(() => updateDisplayName(name), "Saved")}
            disabled={busy}
          >
            Save
          </Button>
        </div>
      </section>

      {/* Household */}
      <section className="space-y-2">
        <SectionTitle>Household</SectionTitle>
        <div className="flex gap-2">
          <Input
            value={hName}
            onChange={(e) => setHName(e.target.value)}
            disabled={!isAdmin}
          />
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => run(() => updateHouseholdName(hName), "Saved")}
              disabled={busy}
            >
              Save
            </Button>
          )}
        </div>
      </section>

      {/* Members */}
      <section className="space-y-2">
        <SectionTitle>Members</SectionTitle>
        <Card className="divide-y divide-border overflow-hidden">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px]">
                {m.name}
                {m.isYou && <span className="text-muted"> (you)</span>}
              </span>
              {m.role === "admin" && <Badge tone="accent">Admin</Badge>}
            </div>
          ))}
        </Card>
        <p className="text-xs text-muted px-1">
          To add a family member: they sign up, then an admin adds them to this
          household (see README).
        </p>
      </section>

      {/* Stores */}
      <section className="space-y-2">
        <SectionTitle>Stores</SectionTitle>
        <Card className="divide-y divide-border overflow-hidden">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[15px]">
                {s.icon} {s.name}
              </span>
              {isAdmin ? (
                <button
                  onClick={() =>
                    run(() => setStoreActive(s.id, !s.active), s.active ? "Hidden" : "Shown")
                  }
                  className="text-sm text-muted underline underline-offset-2"
                >
                  {s.active ? "Active" : "Hidden"}
                </button>
              ) : (
                !s.active && <Badge>Hidden</Badge>
              )}
            </div>
          ))}
        </Card>
        {isAdmin && (
          <div className="flex gap-2">
            <Input
              value={newStore}
              onChange={(e) => setNewStore(e.target.value)}
              placeholder="Add a store (e.g. Costco)"
            />
            <Button
              variant="secondary"
              disabled={busy || !newStore.trim()}
              onClick={async () => {
                const ok = await run(() => createStore({ name: newStore }), "Store added");
                if (ok) setNewStore("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="space-y-2">
        <SectionTitle>Task categories</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-border bg-surface text-sm"
            >
              {c.icon} {c.name}
            </span>
          ))}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Add a category"
            />
            <Button
              variant="secondary"
              disabled={busy || !newCat.trim()}
              onClick={async () => {
                const ok = await run(() => createTaskCategory({ name: newCat }), "Category added");
                if (ok) setNewCat("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>

      {/* Sign out */}
      <form action={signOut}>
        <Button type="submit" variant="secondary" size="lg" className="w-full text-urgent">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
