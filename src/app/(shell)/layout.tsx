import { Sidebar } from "@/components/shell/sidebar";
import { MobileBar } from "@/components/shell/mobile-bar";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { currentUser } from "@/lib/auth";
import { myBalance } from "@/lib/credits";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const balance = await myBalance();

  return (
    <NavProvider>
      <Backdrop />
      <div className="flex min-h-screen">
        <Sidebar user={user} balance={balance} />
        {/* children are NOT wrapped in a re-keying client component: combined
            with the loading.tsx Suspense boundary that left page content
            server-rendered but never hydrated, so nothing was clickable. */}
        <main className="flex min-w-0 flex-1 flex-col">
          <MobileBar />
          {children}
        </main>
      </div>
    </NavProvider>
  );
}
