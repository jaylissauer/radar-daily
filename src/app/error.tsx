"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#10245e_0%,#071229_28%,#040b18_58%,#020611_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16 sm:px-6">
        <section className="w-full rounded-[28px] border border-white/10 bg-white/5 px-6 py-8 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-md sm:px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-white/55">
            AI Signal
          </div>

          <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.04em] text-white sm:text-[42px]">
            This page hit an error
          </h1>

          <p className="mt-4 max-w-2xl text-[16px] leading-8 text-white/72">
            Something went wrong while loading this route. Try again, or return to the homepage.
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
              className="inline-flex items-center rounded-full border border-white/18 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-900"
            >
              Try again
            </button>

            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-white/22 hover:bg-white/10"
            >
              Back to homepage
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
