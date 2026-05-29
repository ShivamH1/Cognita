"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Library,
  GraduationCap,
  BarChart3,
  FilePlus2,
  FileStack,
  MessageSquareText,
  Sparkles,
  Map,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const studentNav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
  },
  {
    href: "/library",
    label: "Library",
    icon: <Library className="w-[18px] h-[18px]" />,
  },
  {
    href: "/study",
    label: "Study Aids",
    icon: <Sparkles className="w-[18px] h-[18px]" />,
  },
  {
    href: "/roadmaps",
    label: "Roadmaps",
    icon: <Map className="w-[18px] h-[18px]" />,
  },
  {
    href: "/assessments",
    label: "Assessments",
    icon: <GraduationCap className="w-[18px] h-[18px]" />,
  },
  {
    href: "/progress",
    label: "Progress",
    icon: <BarChart3 className="w-[18px] h-[18px]" />,
  },
];

const teacherNav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
  },
  {
    href: "/create",
    label: "Create",
    icon: <FilePlus2 className="w-[18px] h-[18px]" />,
  },
  {
    href: "/roadmaps",
    label: "Roadmaps",
    icon: <Map className="w-[18px] h-[18px]" />,
  },
  {
    href: "/assessments",
    label: "My Assessments",
    icon: <FileStack className="w-[18px] h-[18px]" />,
  },
  {
    href: "/library",
    label: "Documents",
    icon: <Library className="w-[18px] h-[18px]" />,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: <BarChart3 className="w-[18px] h-[18px]" />,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = session?.user?.role ?? "STUDENT";
  const nav = role === "TEACHER" ? teacherNav : studentNav;
  const name = session?.user?.name || session?.user?.email || "User";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
            isActive(item.href)
              ? "bg-brand-500/10 text-brand-400 border-l-2 border-brand-500 pl-[13px]"
              : "text-[var(--text-2)] hover:bg-[var(--card-hi)] hover:text-[var(--text)]",
          )}
        >
          <span
            className={cn(
              "transition-colors",
              isActive(item.href) ? "text-brand-400" : "text-[var(--text-3)]",
            )}
          >
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--surface)] border-r border-[var(--border)] fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 py-5 overflow-y-auto scrollbar-thin">
          <p className="px-3.5 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
            {role === "TEACHER" ? "Educator" : "Learner"}
          </p>
          <NavLinks />
        </div>

        {/* Footer: avatar + theme toggle + sign out */}
        <div className="px-3 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow shadow-brand-500/30">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text)] truncate">
                {name}
              </p>
              <p className="text-[11px] text-[var(--text-3)] capitalize">
                {role.toLowerCase()}
              </p>
            </div>
            <ThemeToggle className="w-8 h-8 rounded-lg flex-shrink-0" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-[var(--text-3)] hover:text-rose-400 transition-colors cursor-pointer flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-500/10"
              aria-label="Sign out"
            >
              <LogOut className="w-[16px] h-[16px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--card-hi)]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col animate-slideUp shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--card-hi)] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                {role === "TEACHER" ? "Educator" : "Learner"}
              </p>
            </div>

            <div className="flex-1 px-3 py-4 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>

            {/* Mobile footer */}
            <div className="px-3 py-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 px-2 py-2 rounded-xl mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initials || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {name}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] capitalize">
                    {role.toLowerCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-2)] hover:bg-rose-500/10 hover:text-rose-400 w-full cursor-pointer transition-all"
              >
                <LogOut className="w-[18px] h-[18px]" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}

// Top page header used inside content areas.
export function PageHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="flex items-start gap-3.5">
        {icon && (
          <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[var(--text)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-2)] mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export { MessageSquareText };
