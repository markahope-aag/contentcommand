export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-muted-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <a
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
