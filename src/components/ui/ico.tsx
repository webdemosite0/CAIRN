import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

/**
 * Motion vocabulary. Each one is matched to meaning rather than picked for
 * variety — a bell rings, a globe spins, a table pops into its grid.
 */
export type Motion =
  // movement
  | "spin"
  | "ring"
  | "tilt"
  | "lift"
  | "grow"
  | "pop"
  | "hue"
  | "shake"
  // direction — where the thing goes
  | "nudge"
  | "back"
  | "down"
  | "send"
  | "exit"
  | "launch"
  | "panel"
  // action — what the thing does
  | "open"
  | "close"
  | "copy"
  | "lock"
  | "check"
  | "menu"
  | "fit"
  | "type"
  | "scan"
  | "tick"
  | "stack"
  | "mail"
  | "alert"
  | "sparkle";

/**
 * Wraps a react-icon so it animates.
 *
 * By default motion plays on hover of the nearest `.group` ancestor, which
 * keeps a screen still until the user points at something. `live` loops it
 * (for genuinely ongoing states) and `active` adds the gentle current-page
 * bob. All of it is disabled under prefers-reduced-motion.
 */
export function Ico({
  icon: Icon,
  motion = "pop",
  size = 17,
  live = false,
  active = false,
  className,
  style,
  title,
}: {
  icon: IconType;
  motion?: Motion;
  size?: number;
  live?: boolean;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "ico",
        `ico-${motion}`,
        live && "ico-live",
        active && "ico-active",
        className,
      )}
      style={style}
      title={title}
    >
      <Icon size={size} />
    </span>
  );
}
