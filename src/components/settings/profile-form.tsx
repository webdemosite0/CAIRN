"use client";

import { useActionState, useState } from "react";
import { FiCheck, FiLoader } from "react-icons/fi";

import { updateProfile, type Profile, type ProfileState } from "@/app/actions/profile";
import { Panel, fieldClass } from "@/components/settings/panel";
import { FailureNote } from "@/components/ui/failure-note";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

const MAX_BIO = 280;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  // Held locally only so the counter can move as you type. The field is
  // otherwise uncontrolled — the server owns the saved value.
  const [bio, setBio] = useState(profile.bio);
  const [name, setName] = useState(profile.name);

  const initial = (name.trim() || profile.email).slice(0, 1).toUpperCase();
  const over = bio.length > MAX_BIO;

  return (
    <form action={action} className="space-y-4">
      <Panel
        title="Profile"
        description="How you appear across the workspace."
        footer={
          <>
            <span aria-live="polite" className="min-w-0 text-[12.5px]">
              {state.ok && !pending ? (
                <span className="flex items-center gap-1.5 text-positive">
                  <Ico icon={FiCheck} motion="check" size={13} /> Saved
                </span>
              ) : (
                <span className="text-ink-4">
                  Your name shows on everything you create.
                </span>
              )}
            </span>
            <button
              type="submit"
              disabled={pending || over}
              className="btn-grad flex shrink-0 items-center gap-2 rounded-[var(--r-control)] px-4 py-2 text-[13.5px] font-medium disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Ico icon={FiLoader} motion="spin" size={13} live /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          {/* The avatar is drawn from the name rather than uploaded. There is
              no file store behind this, and a "Change avatar" button that
              opened a picker and then dropped the file would be worse than
              saying plainly where the letter comes from. */}
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-[20px] font-semibold text-accent"
          >
            {initial}
          </span>
          <p className="text-[12.5px] leading-relaxed text-ink-4">
            Your picture is the first letter of your name.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Full name
            </span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Email
            </span>
            <input
              value={profile.email}
              readOnly
              disabled
              autoComplete="email"
              className={cn(fieldClass, "cursor-not-allowed text-ink-3 opacity-70")}
            />
            <span className="mt-1.5 block text-[12px] text-ink-4">
              Changing this means proving the new address, so it is handled in
              Account.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-ink">Bio</span>
              <span
                className={cn(
                  "text-[11.5px] tabular-nums",
                  over ? "text-critical" : "text-ink-4",
                )}
              >
                {bio.length} / {MAX_BIO}
              </span>
            </span>
            <textarea
              name="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you building?"
              className={cn(fieldClass, "resize-y leading-relaxed")}
            />
          </label>
        </div>
      </Panel>

      {state.error ? <FailureNote error={state.error} /> : null}
    </form>
  );
}
