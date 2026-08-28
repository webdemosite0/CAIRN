"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "ghost" | "accent";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  solid: "bg-ink text-canvas hover:bg-ink/88",
  accent: "btn-grad",
  outline: "border border-line-strong bg-canvas text-ink hover:bg-sunk",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-[var(--r-control)] px-3 text-[13px]",
  md: "h-10 gap-2 rounded-[var(--r-control)] px-4 text-[14px]",
};

export function Button({
  variant = "outline",
  size = "md",
  href,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: string;
}) {
  const cls = cn(
    "inline-flex select-none items-center justify-center font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
