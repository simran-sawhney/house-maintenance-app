"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signUpWithKey } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [signupKey, setSignupKey] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        // Gated server-side by SIGNUP_KEY (if configured).
        const res = await signUpWithKey({
          email,
          password,
          displayName,
          key: signupKey,
        });
        if (res.status === "error") {
          setError(res.message);
          return;
        }
        if (res.status === "confirm") {
          setInfo("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
        // status === "ok": session cookie is set by the server action.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      // Session is set — proxy will route no-household users to onboarding.
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <>
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="e.g. Simran"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="signupKey">Signup key</Label>
            <Input
              id="signupKey"
              autoComplete="off"
              placeholder="From your household admin"
              value={signupKey}
              onChange={(e) => setSignupKey(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Only needed if your household uses a signup key.
            </p>
          </div>
        </>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-urgent">{error}</p>}
      {info && <p className="text-sm text-success">{info}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending
          ? "Please wait…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-2"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
