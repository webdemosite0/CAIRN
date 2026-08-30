import Link from "next/link";
import { FiLogOut, FiCheck, FiAlertCircle } from "react-icons/fi";

import { logOut } from "@/app/actions/auth";
import { getProfile } from "@/app/actions/profile";
import { Panel, Row } from "@/components/settings/panel";
import { SignedOut } from "@/components/settings/signed-out";

export const metadata = { title: "Account" };

export default async function AccountSettingsPage() {
  const profile = await getProfile();
  if (!profile) return <SignedOut />;

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <Panel title="Account" description="The details behind your sign-in.">
        <dl className="divide-y divide-line">
          <Row label="Email">
            <span className="text-[13.5px] text-ink">{profile.email}</span>
          </Row>

          <Row
            label="Email verified"
            hint={
              profile.emailVerified
                ? undefined
                : "Some features stay locked until the address is proven."
            }
          >
            {profile.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-positive">
                <FiCheck size={13} /> Verified
              </span>
            ) : (
              <Link
                href="/verify-email"
                className="inline-flex items-center gap-1.5 text-[13px] text-caution hover:underline"
              >
                <FiAlertCircle size={13} /> Verify now
              </Link>
            )}
          </Row>

          <Row
            label="Sign-in method"
            hint={
              profile.provider === "google"
                ? "Google handles the password."
                : undefined
            }
          >
            <span className="text-[13.5px] capitalize text-ink">
              {profile.provider}
            </span>
          </Row>

          <Row label="Plan">
            <Link
              href="/plans"
              className="text-[13.5px] capitalize text-accent hover:underline"
            >
              {profile.plan}
            </Link>
          </Row>

          <Row label="Member since">
            <span className="text-[13.5px] text-ink">{joined}</span>
          </Row>
        </dl>
      </Panel>

      <Panel
        title="Session"
        description="Signs you out on this device. Anything saved stays saved."
      >
        <form action={logOut}>
          <button className="flex items-center gap-2 rounded-[var(--r-control)] border border-critical/35 px-4 py-2 text-[13.5px] text-critical transition-colors hover:bg-critical/10">
            <FiLogOut size={14} /> Log out
          </button>
        </form>
      </Panel>
    </div>
  );
}
