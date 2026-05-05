import AppShell from '@/components/AppShell';

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <header className="px-5 pt-6 pb-4 sm:px-8 sm:pt-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="flex items-center gap-1.5 text-lg font-extrabold text-white">
              <span aria-hidden>⚡</span> Pluggo
            </h1>
            <p className="text-xs text-ink-400">
              Find your next EV charging stop
            </p>
          </div>
          <span className="rounded-full bg-ink-800 px-2.5 py-1 text-[10px] uppercase tracking-wider text-ink-400">
            Prototype
          </span>
        </div>
      </header>

      <section className="px-5 pb-32 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <AppShell />
        </div>
      </section>
    </main>
  );
}
