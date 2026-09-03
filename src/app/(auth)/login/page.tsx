import { AuthCard } from "@/components/auth/auth-card";
import { googleConfigured } from "@/lib/google";

/**
 * Not indexed. Every route behind the sign-in wall redirects here, so Google
 * followed the sitemap into /chat, /team, /spreadsheets and the rest and
 * indexed each of them as "Sign in · Trove" — the site's own search results
 * were a landing page and three sign-in forms.
 *
 * noindex rather than a robots.txt rule on purpose: a blocked URL cannot be
 * crawled, so Google never sees the instruction and leaves what it already
 * has in the index. It has to be able to read the page to learn to drop it.
 */
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; verified?: string }>;
}) {
  const { error, next, verified } = await searchParams;

  return (
    <AuthCard
      mode="login"
      googleEnabled={googleConfigured()}
      oauthError={error}
      next={next}
      justVerified={verified === "1"}
    />
  );
}
