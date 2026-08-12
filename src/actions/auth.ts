"use server";

import { createClient } from "@/lib/supabase/server";

export type SignUpResult =
  | { status: "ok" }
  | { status: "confirm" }
  | { status: "error"; message: string };

/**
 * Gated sign-up (build spec: private family app). If the server env
 * `SIGNUP_KEY` is set, the caller must supply a matching key — this lets an
 * admin distribute one shared key (set as an env var in Vercel) so only people
 * with it can create accounts. If `SIGNUP_KEY` is unset, sign-up is open.
 *
 * Runs server-side so the secret key is never shipped to the browser.
 */
export async function signUpWithKey(input: {
  email: string;
  password: string;
  displayName?: string;
  key?: string;
}): Promise<SignUpResult> {
  const required = process.env.SIGNUP_KEY?.trim();
  if (required) {
    if (!input.key || input.key.trim() !== required) {
      return {
        status: "error",
        message: "That signup key isn't valid. Ask your household admin.",
      };
    }
  }

  const email = input.email.trim();
  const password = input.password;
  if (!email || password.length < 6) {
    return { status: "error", message: "Enter an email and a 6+ char password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: input.displayName?.trim()
        ? { display_name: input.displayName.trim() }
        : undefined,
    },
  });
  if (error) return { status: "error", message: error.message };
  // No session -> email confirmation is on; the user must confirm then sign in.
  if (!data.session) return { status: "confirm" };
  return { status: "ok" };
}
