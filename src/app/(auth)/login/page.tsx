import { AuthCard } from "@/components/auth/auth-card";
import { googleConfigured } from "@/lib/google";

export const metadata = { title: "Sign in" };

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
