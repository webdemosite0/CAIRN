export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-5 py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-[110px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(59,130,246,0.18), rgba(167,139,250,0.10) 45%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-[420px]">{children}</div>
    </div>
  );
}
