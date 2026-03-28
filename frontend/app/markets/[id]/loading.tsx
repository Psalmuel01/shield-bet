export default function MarketLoading() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="loading-skeleton h-3 w-16" />
        <span>&gt;</span>
        <div className="loading-skeleton h-3 w-14" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <div className="surface p-6">
            <div className="loading-skeleton h-4 w-32" />
            <div className="mt-4 loading-skeleton h-10 w-full rounded-2xl" />
            <div className="mt-3 loading-skeleton h-10 w-4/5 rounded-2xl" />
            <div className="mt-6 grid gap-2">
              <div className="loading-skeleton h-4 w-56" />
              <div className="loading-skeleton h-4 w-48" />
              <div className="loading-skeleton h-4 w-40" />
            </div>
          </div>

          <div className="surface p-6">
            <div className="loading-skeleton h-4 w-28" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="loading-skeleton h-12 rounded-xl" />
              <div className="loading-skeleton h-12 rounded-xl" />
            </div>
            <div className="mt-4 loading-skeleton h-12 w-full rounded-xl" />
            <div className="mt-4 loading-skeleton h-12 w-full rounded-xl" />
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface p-5">
              <div className="loading-skeleton h-4 w-28" />
              <div className="mt-4 space-y-3">
                <div className="loading-skeleton h-11 w-full rounded-xl" />
                <div className="loading-skeleton h-11 w-full rounded-xl" />
                <div className="loading-skeleton h-11 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
