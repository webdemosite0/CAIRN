import { ThemePicker } from "@/components/settings/theme-picker";

export const metadata = { title: "Appearance" };

export default function AppearanceSettingsPage() {
  // No session needed: the theme lives in the browser, so this screen works
  // signed out and there is nothing here to gate.
  return <ThemePicker />;
}
