export function RightPanel() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] py-4">
      <p className="px-4 pb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Details
      </p>
      <div className="flex flex-1 flex-col gap-3 px-4 text-sm text-[var(--text-muted)]">
        <p>No item selected.</p>
        <p className="text-xs leading-relaxed">
          Placeholder panel for summaries, filters, or contextual actions.
        </p>
      </div>
    </aside>
  );
}
