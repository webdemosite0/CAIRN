"use client";

import { useId, useState } from "react";
import { FiEye, FiEyeOff, FiAlertTriangle } from "react-icons/fi";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

/**
 * A password input with the three things people actually need from one.
 *
 * Reveal, because typing a long password blind into a field that rejects it
 * silently is the commonest reason someone gives up at a login screen.
 *
 * A caps-lock warning, because a wrong password caused by caps lock looks
 * identical to a wrong password, and the person retypes the same thing.
 *
 * A strength meter on signup only. On the login form it would be noise — the
 * password already exists and rating it changes nothing.
 */

/**
 * Deliberately crude, and honest about it.
 *
 * Length dominates because length is what actually resists guessing; the
 * character-class checks are a nudge, not a security claim. This never blocks
 * a submission — the server's own 8-character minimum does that. A meter that
 * refuses "correct horse battery staple" for lacking a symbol teaches people
 * to write worse passwords.
 */
function strengthOf(value: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (value.length < 8) return { score: 0, label: "Too short" };

  let points = 0;
  if (value.length >= 12) points++;
  if (value.length >= 16) points++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points++;
  if (/\d/.test(value)) points++;
  if (/[^\w\s]/.test(value)) points++;

  if (points <= 1) return { score: 1, label: "Weak" };
  if (points <= 3) return { score: 2, label: "Good" };
  return { score: 3, label: "Strong" };
}

const BAR = ["bg-line-strong", "bg-critical", "bg-caution", "bg-positive"] as const;

export function PasswordField({
  name = "password",
  placeholder,
  autoComplete,
  className,
  showStrength = false,
  minLength = 8,
}: {
  name?: string;
  placeholder: string;
  autoComplete: string;
  className?: string;
  /** Signup only. See above. */
  showStrength?: boolean;
  minLength?: number;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const hintId = useId();

  const strength = showStrength && value ? strengthOf(value) : null;

  return (
    <div>
      <div className="relative">
        <input
          className={cn(className, "pr-11")}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // getModifierState is the only reliable read, and it is only
          // available on a real keyboard event.
          onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
          onKeyDown={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
          onBlur={() => setCaps(false)}
          aria-describedby={caps || strength ? hintId : undefined}
        />

        <button
          type="button"
          // Never a submit, and never in the tab order between the field and
          // the button someone is actually reaching for.
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          className="group absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
        >
          <Ico icon={visible ? FiEyeOff : FiEye} motion="pop" size={16} />
        </button>
      </div>

      <div id={hintId} className="min-h-[18px]">
        {caps ? (
          <p className="nx-in mt-1.5 flex items-center gap-1.5 text-[12px] text-caution">
            <Ico icon={FiAlertTriangle} motion="alert" size={12} />
            Caps Lock is on
          </p>
        ) : null}

        {strength ? (
          <div className="nx-in mt-2 flex items-center gap-2">
            <span className="flex h-1 flex-1 gap-1" aria-hidden>
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-full flex-1 rounded-full transition-colors duration-[var(--t-panel)]",
                    strength.score >= step ? BAR[strength.score] : "bg-line",
                  )}
                />
              ))}
            </span>
            <span
              className={cn(
                "w-[62px] text-right text-[11.5px] tabular-nums",
                strength.score === 0 && "text-ink-4",
                strength.score === 1 && "text-critical",
                strength.score === 2 && "text-caution",
                strength.score === 3 && "text-positive",
              )}
            >
              {strength.label}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
