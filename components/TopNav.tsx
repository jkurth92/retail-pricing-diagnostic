export function TopNav() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[var(--border)] bg-[var(--surface)] px-6">
      <span className="text-sm font-medium tracking-tight text-[var(--text)]">
        Retali Pricing Diagnostic
      </span>
      <nav className="ml-10 flex gap-6 text-sm text-[var(--text-muted)]">
        <span className="cursor-default">Overview</span>
        <span className="cursor-default">Reports</span>
        <span className="cursor-default">Settings</span>
      </nav>
    </header>
  );
}
