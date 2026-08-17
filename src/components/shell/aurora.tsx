import { cn } from "@/lib/utils";

/**
 * Slow-drifting colour field behind the home hero. Decorative only.
 *
 * The blobs are theme-aware through --aurora-*: on dark they are bright hues
 * that bloom against black; on light the same hues at a fraction of the alpha,
 * because a 32%-alpha blue blob on white reads as a washed-out stain rather
 * than light. Grid duplication is deliberately absent — Backdrop draws the only
 * grid, at 72px; a second one at 64px moirés against it.
 */
export function Aurora({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="nx-aurora absolute left-1/2 top-[-30%] h-[70vh] w-[110vw] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          opacity: 0.5 * intensity,
          background:
            "radial-gradient(ellipse at 30% 40%, var(--aurora-a), transparent 62%)," +
            "radial-gradient(ellipse at 70% 55%, var(--aurora-b), transparent 60%)",
        }}
      />
      <div
        className="nx-aurora absolute bottom-[-35%] right-[-10%] h-[55vh] w-[70vw] rounded-full blur-[120px]"
        style={{
          opacity: 0.36 * intensity,
          animationDelay: "-8s",
          background: "radial-gradient(ellipse at center, var(--aurora-c), transparent 65%)",
        }}
      />
    </div>
  );
}
