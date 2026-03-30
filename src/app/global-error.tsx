"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,#10245e_0%,#071229_28%,#040b18_58%,#020611_100%)] text-white">
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16 sm:px-6">
          <section className="w-full rounded-[28px] border border-white/10 bg-white/5 px-6 py-8 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-md sm:px-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-white/55">
              AI Signal
            </div>

            <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.04em] text-white sm:text-[42px]">
              Something went wrong
            </h1>

            <p className="mt-4 max-w-2xl text-[16px] leading-8 text-white/72">
              The app hit an unexpected error. Try reloading this view. If it keeps happening, this route likely needs a code fix.
            </p>

            {error?.message ? (
              <div className="mt-6 rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm leading-7 text-rose-100">
                {error.message}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center rounded-full border border-white/20 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
              >
                Try again
              </button>

              <a
                href="/"
                className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-white/22 hover:bg-white/10"
              >
                Back to homepage
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
