import { AuthCard } from "@/components/auth/auth-card";
import { googleConfigured } from "@/lib/google";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthCard mode="signup" googleEnabled={googleConfigured()} oauthError={error} />;
}
