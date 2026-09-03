import { Backdrop } from "@/components/shell/backdrop";
import { LandingNav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

/**
 * The public pages: everything a visitor can read without an account.
 *
 * A separate group from the app because these share the marketing chrome and
 * nothing else — no rail, no credit meter, no session. They are also the only
 * pages in the site that belong in a search index, which is easier to keep
 * true when they live together.
 *
 * Deliberately no redirect for signed-in visitors. The landing page sends them
 * to /chat, which is right for the front door; doing it here would mean
 * someone with an account could never read the pricing page.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Backdrop />
      <LandingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
