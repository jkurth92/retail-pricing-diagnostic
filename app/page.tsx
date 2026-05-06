export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-lg font-medium tracking-tight text-[var(--text)]">
        Main content
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        This is placeholder content for the primary workspace area. Replace it
        with charts, tables, or forms as you build the product.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
        Content placeholder
      </div>
    </div>
  );
}
