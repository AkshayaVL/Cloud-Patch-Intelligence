"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Shield, LayoutDashboard, Scan, GitPullRequest,
  Settings, LogOut, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: Scan },
  { href: "/prs", label: "PR Tracker", icon: GitPullRequest },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-0 flex items-center h-16">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-10">
          <div className="w-8 h-8 rounded-lg bg-indigo-gradient flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-slate-900 text-base">CPI</span>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}>
                  <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : ""}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
            <div className="w-6 h-6 rounded-full bg-indigo-gradient flex items-center justify-center text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <span className="text-slate-700 text-sm font-medium max-w-[160px] truncate">
              {user?.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}