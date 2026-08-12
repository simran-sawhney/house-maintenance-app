import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-muted mt-1 mb-6 text-sm">
        That page doesn&rsquo;t exist.
      </p>
      <Link
        href="/"
        className="inline-flex items-center h-11 px-5 rounded-xl bg-primary text-primary-foreground font-medium"
      >
        Go home
      </Link>
    </main>
  );
}
