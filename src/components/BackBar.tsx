"use client";

import Link from "next/link";

type Props = {
  href: string;
  title: string;
};

export function BackBar({ href, title }: Props) {
  return (
    <div className="flex items-center gap-3 pb-4 pt-1">
      <Link
        href={href}
        aria-label="Späť"
        className="text-xl text-gray-400 transition hover:text-ink"
      >
        {"←"}
      </Link>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
    </div>
  );
}
