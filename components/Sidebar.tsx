const items = ["Dashboard", "Diagnostics", "History", "Exports"];

export function Sidebar() {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] py-4">
      <p className="px-4 pb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Navigation
      </p>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((label) => (
          <span
            key={label}
            className="cursor-default rounded-md px-2 py-2 text-sm text-[var(--text)] hover:bg-neutral-100"
          >
            {label}
          </span>
        ))}
      </nav>
    </aside>
  );
}
