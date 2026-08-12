import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
          {/* Simple house mark */}
          <svg width="30" height="30" viewBox="0 0 512 512" aria-hidden>
            <path
              d="M256 116 L404 236 V396 a16 16 0 0 1 -16 16 H300 V300 a12 12 0 0 0 -12 -12 H224 a12 12 0 0 0 -12 12 V412 H124 a16 16 0 0 1 -16 -16 V236 Z"
              fill="#f6f5f2"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Our Home</h1>
        <p className="mt-1 text-muted text-[15px]">
          Your family&rsquo;s shared household command centre.
        </p>
      </div>
      <AuthForm />
    </main>
  );
}
