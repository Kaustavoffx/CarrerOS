"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { memo, useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Roadmaps", href: "/roadmaps" },
  { label: "Career Twin", href: "/career-twin" },
  { label: "AI Mentor", href: "/mentor" },
  { label: "Community Support", href: "/community" },
  { label: "Settings", href: "/settings" },
  { label: "Profile", href: "/profile" }
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.04] bg-[rgba(8,12,20,0.48)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="CareerOS"
            width={32}
            height={32}
            className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-medium tracking-[0.08em] text-white">CareerOS</span>
            <span className="caption text-slate-500">Private career workspace</span>
          </span>
        </Link>
 
        <nav className="hidden items-center gap-2 rounded-full border border-[#141417] bg-[#0c0c0e] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:flex">
          {navigation.map((item) => (
            <Link key={item.label} href={item.href} className="rounded-full px-4 py-2 small text-slate-400 transition hover:bg-[#16161c] hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
 
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 small font-medium tactile-btn text-slate-200"
          >
            Sign in
          </Link>
        </div>
 
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#141417] bg-[#0a0a0c] text-white transition duration-300 hover:border-cyan-300/30 hover:bg-cyan-400/10 lg:hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.25)]"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen ? (
        <div className="mx-6 mb-4 rounded-3xl border border-[#141417] bg-[#0c0c0e] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.25)] lg:hidden">
          <div className="flex flex-col gap-2">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl px-4 py-3 small text-slate-300 transition hover:bg-[#16161c] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-1 rounded-2xl px-4 py-3 small font-medium text-center text-white tactile-btn-primary"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export const MemoSiteHeader = memo(SiteHeader);