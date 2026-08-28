import { cn } from "@/lib/utils";

/**
 * A placeholder shaped like the thing that is coming.
 *
 * The app had no skeletons: a wait was either a spinner or an empty region
 * that reflowed the moment content arrived. A spinner says "something is
 * happening"; a skeleton says "something of this shape is happening", and the
 * page stops jumping when it lands.
 *
 * Hidden from assistive technology. A screen reader announcing four grey
 * rectangles is worse than silence — the live region that announces the real
 * content is what should speak.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <span aria-hidden className={cn("skeleton block", className)} style={style} />;
}

/**
 * The shape of a paragraph being written.
 *
 * The last line is short because real paragraphs end mid-measure; a block of
 * equal-length bars reads as a table, not as prose, and the eye notices before
 * the mind does.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span className={cn("block space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-[13px] rounded-[var(--r-chip)]"
          style={{
            width: i === lines - 1 ? "62%" : i % 3 === 1 ? "94%" : "100%",
            // Staggered so the sweep travels down the block rather than
            // flashing every line at once.
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </span>
  );
}
