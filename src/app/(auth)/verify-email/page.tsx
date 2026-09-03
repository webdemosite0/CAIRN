import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { mailerConfigured } from "@/lib/mail";
import { VerifyCard } from "@/components/auth/verify-card";

/** Not indexed — reached from a link in an email, never from a search. */
export const metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const user = await currentUser();

  // Signed out, or already done — neither has anything to do here.
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/chat");

  return <VerifyCard email={user.email} mailerConfigured={mailerConfigured()} />;
}
