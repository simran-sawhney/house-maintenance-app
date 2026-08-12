"use client";

import { useActionState } from "react";
import { createHousehold, type OnboardingState } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

export function OnboardingForm({
  defaultDisplayName,
}: {
  defaultDisplayName: string;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createHousehold,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">Household name</Label>
        <Input id="name" name="name" defaultValue="Our Home" autoFocus />
      </div>
      <div>
        <Label htmlFor="display_name">Your display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultDisplayName}
          placeholder="e.g. Mum, Dad, Simran"
        />
      </div>
      {state.error && <p className="text-sm text-urgent">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create Home"}
      </Button>
    </form>
  );
}
