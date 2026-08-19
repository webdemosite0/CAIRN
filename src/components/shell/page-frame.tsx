import { cn } from "@/lib/utils";

/** Standard page scaffold: quiet title bar, then content. */
export function PageFrame({
  title,
  description,
  action,
  children,
  width = "wide",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="nx-in min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div
          className={cn(
            "mx-auto flex h-14 items-center justify-between gap-4 px-5",
            width === "narrow" ? "max-w-[760px]" : "max-w-[1120px]",
          )}
        >
          <h1 className="truncate text-[15px] font-semibold text-ink">{title}</h1>
          {action}
        </div>
      </header>

      <div
        className={cn(
          "mx-auto px-5 py-8 lg:px-8",
          width === "narrow" ? "max-w-[760px]" : "max-w-[1120px]",
        )}
      >
        {description ? (
          <p className="mb-8 max-w-xl text-[14px] leading-relaxed text-ink-2">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

