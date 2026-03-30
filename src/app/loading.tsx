export default function Loading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#10245e_0%,#071229_28%,#040b18_58%,#020611_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <section className="mb-5 rounded-[28px] border border-white/10 bg-white/5 px-5 py-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-md sm:px-6">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-4 h-5 w-full max-w-3xl animate-pulse rounded-xl bg-white/10" />
          <div className="mt-2 h-5 w-full max-w-2xl animate-pulse rounded-xl bg-white/10" />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`feature-${i}`}
              className="h-[420px] animate-pulse rounded-[26px] border border-white/10 bg-white/5"
            />
          ))}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`card-${i}`}
              className="h-[390px] animate-pulse rounded-[26px] border border-white/10 bg-white/5"
            />
          ))}
        </section>
      </div>
    </main>
  );
}
