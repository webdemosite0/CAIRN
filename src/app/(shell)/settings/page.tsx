import { getProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/settings/profile-form";
import { SignedOut } from "@/components/settings/signed-out";

export const metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const profile = await getProfile();
  if (!profile) return <SignedOut />;
  return <ProfileForm profile={profile} />;
}
