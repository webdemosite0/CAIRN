import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

/**
 * Settings is a set of screens, not a page.
 *
 * The header and the section list are shared so that moving between sections
 * changes only the panel — the title does not re-enter and the nav does not
 * re-render, which is what makes it feel like one screen with parts rather
 * than seven pages that happen to look alike.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="nx-in mx-auto min-h-screen w-full max-w-[1040px] px-5 py-9 lg:px-8">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, appearance and usage."
      />

      <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:gap-9">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
