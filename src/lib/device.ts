import "server-only";
import { cookies, headers } from "next/headers";

/**
 * Which UI to serve: the desktop one, or the separate mobile one.
 *
 * Decided on the server from the user agent, not in the browser from a media
 * query, and the reason is what happens on the first paint. A client-side
 * check cannot know the viewport until after hydration, so the server would
 * have to guess — and every wrong guess is a full desktop layout flashing on a
 * phone before it swaps. Deciding here means the correct tree is the only one
 * ever rendered or sent.
 *
 * The cost is that a narrow window on a desktop machine still gets the desktop
 * UI. That is the right trade for this app: these are two designs for two
 * devices, not one design that reflows. Resizing a laptop window is not the
 * case being served — and ?ui=mobile covers wanting to look at it anyway.
 *
 * Tablets deliberately count as desktop. An iPad has the width for the real
 * layout, and the mobile UI's bottom tab bar and single-column pages waste it.
 */

/** The pin set by ?ui=mobile / ?ui=desktop. See middleware.ts. */
export const UI_COOKIE = "nx_ui";

/**
 * Matches phones, and only phones.
 *
 * "Mobile" is the token every phone browser sends, including Firefox and
 * Opera. iPad is excluded explicitly, and Android tablets send "Android"
 * without "Mobile" — which this pattern already skips by requiring both.
 */
const PHONE = /Android.+Mobile|iPhone|iPod|Windows Phone|BlackBerry|BB10|Opera Mini|IEMobile/i;

export function isPhoneUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (/iPad|Tablet/i.test(ua)) return false;
  return PHONE.test(ua);
}

/** True when this request should be served the mobile UI. */
export async function isMobile(): Promise<boolean> {
  // An explicit pin wins, so the phone UI can be opened from a laptop.
  // ?ui=auto clears it; see middleware.ts.
  const pinned = (await cookies()).get(UI_COOKIE)?.value;
  if (pinned === "mobile") return true;
  if (pinned === "desktop") return false;

  return isPhoneUserAgent((await headers()).get("user-agent"));
}
