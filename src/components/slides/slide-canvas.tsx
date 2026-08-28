"use client";

import type { Slide } from "@/lib/slides";
import { cn } from "@/lib/utils";
import { Editable } from "@/components/slides/editable";

/**
 * One slide, drawn at a fixed 16:9 ratio.
 *
 * Type is sized in `cqw` (percent of the slide's own width) rather than px, so
 * the same component is legible as a 150px thumbnail, as the main stage, and
 * full-screen in present mode without a second set of styles. The container
 * query unit needs `container-type: inline-size`, set below.
 */
export function SlideCanvas({
  slide,
  index,
  total,
  className,
  thumb = false,
  edit,
}: {
  slide: Slide;
  index: number;
  total: number;
  className?: string;
  /** Thumbnails skip the slide number and clamp the bullet list. */
  thumb?: boolean;
  /**
   * Supplied only by the editor. Absent everywhere else — the thumbnail rail
   * and the presenter view render exactly the same component read-only, so a
   * deck cannot look different from the thing being edited.
   */
  edit?: {
    onTitle: (v: string) => void;
    onBullet: (i: number, v: string) => void;
    onAddBullet: (after: number) => void;
    onRemoveBullet: (i: number) => void;
  };
}) {
  const titleOnly = !slide.bullets.length;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-[var(--r-panel)] border border-line bg-raised",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      {/* A soft corner wash, the deck's echo of the app background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, var(--orb-a), transparent 62%)",
        }}
      />

      <div className="relative flex h-full flex-col justify-center px-[7cqw] py-[6cqw]">
        <span
          aria-hidden
          className="mb-[2.6cqw] block h-[0.7cqw] w-[7cqw] rounded-full bg-accent"
        />

        <h2
          className={cn(
            "font-semibold tracking-tight text-ink",
            titleOnly ? "text-[6.4cqw] leading-[1.12]" : "text-[4.6cqw] leading-[1.16]",
          )}
        >
          {edit ? (
            <Editable
              ariaLabel={`Title of slide ${index + 1}`}
              value={slide.title}
              placeholder={`Slide ${index + 1}`}
              onChange={edit.onTitle}
              onEnter={() => edit.onAddBullet(-1)}
            />
          ) : (
            slide.title || `Slide ${index + 1}`
          )}
        </h2>

        {slide.bullets.length ? (
          <ul className={cn("mt-[3.2cqw] space-y-[1.7cqw]", thumb && "overflow-hidden")}>
            {(thumb ? slide.bullets.slice(0, 4) : slide.bullets).map((b, i) => (
              <li key={i} className="flex gap-[2cqw] text-[2.5cqw] leading-[1.45] text-ink-2">
                <span
                  aria-hidden
                  className="mt-[0.85cqw] h-[0.85cqw] w-[0.85cqw] shrink-0 rounded-full bg-accent"
                />
                {edit ? (
                  <Editable
                    className="min-w-0 flex-1"
                    ariaLabel={`Bullet ${i + 1} on slide ${index + 1}`}
                    value={b}
                    placeholder="Empty point"
                    onChange={(v) => edit.onBullet(i, v)}
                    onEnter={() => edit.onAddBullet(i)}
                    onEmptyBackspace={() => edit.onRemoveBullet(i)}
                  />
                ) : (
                  <span className="min-w-0">{b}</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {!thumb ? (
        <span className="absolute bottom-[4cqw] right-[6cqw] text-[1.9cqw] tabular-nums text-ink-4">
          {index + 1} / {total}
        </span>
      ) : null}
    </div>
  );
}
