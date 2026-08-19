"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  FiSearch,
  FiCheck,
  FiPlus,
  FiLock,
} from "react-icons/fi";
import { disconnect } from "@/app/actions/connections";
import { ConnectDialog } from "@/components/integrations/connect-dialog";
import { CATEGORIES, SERVICES, type Category } from "@/lib/services";
import { IntegrationsHero } from "@/components/integrations/hero";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

export interface ConnectedService {
  service: string;
  account: string;
  hint: string;
}

export function IntegrationsView({
  connected,
  connectable,
  signedIn,
}: {
  connected: ConnectedService[];
  /** Services Trove can actually authenticate, with what to ask for. */
  connectable: Record<string, { label: string; help: string; docs?: string }>;
  signedIn: boolean;
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [pending, startTransition] = useTransition();

  // Disconnecting is instant and local; connecting cannot be optimistic
  // because it depends on the provider accepting the credential.
  const [optimistic, dropOne] = useOptimistic(
    connected,
    (state: ConnectedService[], id: string) => state.filter((s) => s.service !== id),
  );

  const byId = useMemo(
    () => new Map(optimistic.map((c) => [c.service, c])),
    [optimistic],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  function remove(id: string) {
    startTransition(async () => {
      dropOne(id);
      await disconnect(id);
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1120px] px-5 py-8 lg:px-8">
      <IntegrationsHero total={SERVICES.length} connected={optimistic.length} />

      {/* Title and search on one line, so the list starts higher up. */}
      <div className="mb-5 mt-9 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[19px] font-semibold text-ink">My integrations</h2>

        <div className="relative w-full sm:w-[340px]">
          <Ico
            icon={FiSearch}
            motion="scan"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search integrations"
            className="h-11 w-full rounded-[10px] border border-line bg-sunk pl-10 pr-4 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent"
          />
        </div>
      </div>

      {/* categories */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
              category === c
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line-strong py-16 text-center text-[13.5px] text-ink-4">
          Nothing matches “{query}”.
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
          {results.map((s, i) => {
            const conn = byId.get(s.id);
            const on = Boolean(conn);
            const spec = connectable[s.id];
            return (
              <article
                key={s.id}
                className={cn(
                  "nx-in flex flex-col rounded-[10px] border p-4 transition-all duration-200",
                  on
                    ? "border-positive/30 bg-positive/6"
                    : "border-line bg-rail hover:border-line-strong",
                )}
                style={{
                  animationDelay: `${Math.min(i, 18) * 22}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[13px] font-semibold",
                        on
                          ? "bg-positive/15 text-positive"
                          : "bg-raised text-ink-3",
                      )}
                    >
                      {s.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-medium text-ink">{s.name}</h3>
                      <p className="truncate text-[11.5px] text-ink-4">
                        {conn ? `${conn.account || "connected"} · ${conn.hint}` : s.category}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-ink-3">
                  {s.blurb}
                </p>

                {/* Three honest states. Connected means a credential this
                    provider accepted; Connect means Trove can authenticate it
                    here; the rest need an OAuth app only the account owner can
                    register, and say so rather than offering a dead button. */}
                {on ? (
                  <button
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    className="group mt-3.5 flex items-center justify-center gap-1.5 rounded-[8px] border border-positive/35 py-2 text-[13px] text-positive transition-colors hover:border-critical/40 hover:bg-critical/10 hover:text-critical disabled:opacity-50"
                  >
                    <Ico icon={FiCheck} motion="check" size={13} />
                    <span className="group-hover:hidden">Connected</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </button>
                ) : spec ? (
                  <button
                    onClick={() => setOpening(s.id)}
                    disabled={!signedIn || pending}
                    className="group mt-3.5 flex items-center justify-center gap-1.5 rounded-[8px] border border-line-strong py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
                  >
                    <Ico icon={FiPlus} motion="open" size={13} /> Connect
                  </button>
                ) : (
                  <span
                    title="This service authenticates through OAuth, which needs a client id and secret registered with the provider."
                    className="mt-3.5 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-line-strong py-2 text-[12.5px] text-ink-4"
                  >
                    <FiLock size={11} /> Needs an OAuth app
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}

      {opening && connectable[opening] ? (
        <ConnectDialog
          service={opening}
          name={SERVICES.find((x) => x.id === opening)?.name ?? opening}
          label={connectable[opening].label}
          help={connectable[opening].help}
          docs={connectable[opening].docs}
          onClose={() => setOpening(null)}
        />
      ) : null}
    </div>
  );
}
