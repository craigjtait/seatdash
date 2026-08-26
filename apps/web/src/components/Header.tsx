"use client";

import Link from "next/link";

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-brand-blue text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="block">
            <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
              Seat Dash
            </h1>
            {subtitle && (
              <p className="text-brand-silver text-sm font-body">{subtitle}</p>
            )}
          </Link>
          <Link
            href="/delivery"
            className="text-xs font-medium text-white/80 hover:text-white border border-white/30 rounded px-2 py-1"
          >
            Staff
          </Link>
        </div>
      </div>
    </header>
  );
}
