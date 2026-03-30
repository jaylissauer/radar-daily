"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Building2,
  Home,
  Package,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

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

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-page">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-row">
            <div className="brand-badge">
              <Sparkles size={20} />
            </div>

            <div className="brand-meta">
              <div className="brand-title">AI Signal</div>
              <div className="brand-subtitle">Personal AI intelligence hub</div>
            </div>
          </div>

          <div className="nav-group">
            <div className="nav-label">Navigation</div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  <Icon className="nav-link-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <p className="sidebar-note">
              Daily AI launches, company tracking, product discovery, and saved
              reading in one place.
            </p>
          </div>
        </aside>

        <main className="main-panel">
          <header className="topbar">
            <div className="topbar-title-wrap">
              <div className="eyebrow">Private dashboard</div>
              <h1 className="topbar-title">{title}</h1>
              <p className="topbar-subtitle">{subtitle}</p>
            </div>

            <div className="topbar-actions">
              <label className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search articles, companies, products..."
                />
              </label>

              <button className="ghost-button" type="button">
                <RefreshCw size={16} />
              </button>

              <button className="primary-button" type="button">
                Refresh feed
              </button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}