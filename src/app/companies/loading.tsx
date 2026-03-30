export default function CompaniesLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#10245e_0%,#071229_28%,#040b18_58%,#020611_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <section className="mb-5 rounded-[28px] border border-white/10 bg-white/5 px-6 py-6 shadow-[0_16px_45px_rgba(0,0,0,0.18)]">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-3 h-5 w-full max-w-3xl animate-pulse rounded-xl bg-white/10" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-[260px] animate-pulse rounded-[26px] border border-white/10 bg-white/5"
            />
          ))}
        </section>
      </div>
    </main>
  );
}
