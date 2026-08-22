import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

/**
 * The way out of a full-screen tool.
 *
 * Studio pages have no rail and no tab bar — that is the point of them — which
 * makes every one of them a dead end without this. One component rather than a
 * link pasted into each tool, because the one that gets forgotten is the one
 * someone gets stuck on, and a phone has no sidebar to fall back to.
 */
export function StudioBack({
  className,
  label = "Trove",
  href = "/chat",
}: {
  className?: string;
  label?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink",
        className,
      )}
    >
      <Ico icon={FiArrowLeft} motion="back" size={15} />
      {label}
    </Link>
  );
}
