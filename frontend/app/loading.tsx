export default function AppLoading() {
  return (
    <section className="space-y-5">
      <div className="hero-frame">
        <div className="loading-skeleton h-4 w-32" />
        <div className="mt-5 space-y-3">
          <div className="loading-skeleton h-10 w-full max-w-2xl rounded-2xl" />
          <div className="loading-skeleton h-10 w-4/5 rounded-2xl" />
        </div>
        <div className="mt-5 space-y-2">
          <div className="loading-skeleton h-4 w-full max-w-2xl" />
          <div className="loading-skeleton h-4 w-3/4" />
        </div>
        <div className="mt-8 flex gap-3">
          <div className="loading-skeleton h-11 w-40 rounded-xl" />
          <div className="loading-skeleton h-11 w-36 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="stat-card">
            <div className="loading-skeleton h-3 w-24" />
            <div className="mt-4 loading-skeleton h-7 w-36 rounded-xl" />
            <div className="mt-3 loading-skeleton h-4 w-full" />
            <div className="mt-2 loading-skeleton h-4 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
