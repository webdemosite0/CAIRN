import Link from "next/link";

import { Panel } from "@/components/settings/panel";

/** What every settings section shows when there is no session behind it. */
export function SignedOut() {
  return (
    <Panel
      title="Log in to manage your account"
      description="Settings are tied to an account, so there is nothing to show until you are signed in."
    >
      <Link
        href="/login"
        className="btn-grad inline-flex rounded-[var(--r-control)] px-4 py-2 text-[13.5px] font-medium"
      >
        Log in
      </Link>
    </Panel>
  );
}
