import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser, getHouseholdContext } from "@/lib/auth/household";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = { title: "Create your Home" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  // Already in a household? Skip straight to the app.
  const ctx = await getHouseholdContext();
  if (ctx) redirect("/");

  const suggestedName =
    (user.user_metadata?.display_name as string | undefined) || "";

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your Home
        </h1>
        <p className="mt-1 text-muted text-[15px]">
          A shared space for shopping, tasks and everything your household
          needs.
        </p>
      </div>
      <OnboardingForm defaultDisplayName={suggestedName} />
    </main>
  );
}
