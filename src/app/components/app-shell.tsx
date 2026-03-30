"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Building2,
  Home,
  Menu,
  Package,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/products", label: "Products", icon: Package },
];

function navLinkClasses(isActive: boolean) {
  return [
    "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition",
    isActive
      ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
      : "border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white",
  ].join(" ");
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const activeLabel = useMemo(() => {
    const matched = navItems.find((item) => item.href === pathname);
    return matched?.label ?? "Dashboard";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/8 bg-[#08111d]/90 lg:flex lg:flex-col">
          <div className="border-b border-white/8 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                <Sparkles size={20} />
              </div>

              <div>
                <div className="text-base font-semibold tracking-tight text-white">
                  AI Signal
                </div>
                <div className="text-sm text-white/55">
                  Personal AI intelligence hub
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="mb-3 px-2 text-[11px] uppercase tracking-[0.22em] text-white/35">
              Navigation
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navLinkClasses(isActive)}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/8 px-6 py-5">
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm leading-6 text-white/60">
                Daily AI launches, company tracking, product discovery, and saved
                reading in one place.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/8 bg-[#07111f]/88 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>

                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
                    {activeLabel}
                  </div>
                  <h1 className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {title}
                  </h1>
                  <p className="mt-1 hidden max-w-2xl text-sm text-white/60 sm:block">
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                  type="button"
                >
                  <RefreshCw size={16} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 sm:px-6 lg:hidden">
              <p className="text-sm text-white/60">{subtitle}</p>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsMobileNavOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 w-[88%] max-w-[320px] border-r border-white/10 bg-[#08111d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                  <Sparkles size={18} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">AI Signal</div>
                  <div className="text-xs text-white/50">Personal AI intelligence hub</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/75"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-5">
              <div className="mb-3 px-2 text-[11px] uppercase tracking-[0.22em] text-white/35">
                Navigation
              </div>

              <nav className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={navLinkClasses(isActive)}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm leading-6 text-white/60">
                  Track AI launches, company moves, and product updates in a mobile-friendly feed.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}