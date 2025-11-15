export default function TopBar({
  onRefresh,
  onOpenFilters,
  onOpenSearch,
  onOpenArchive,
}: {
  onRefresh: () => void;
  onOpenFilters: () => void;
  onOpenSearch: () => void;
  onOpenArchive: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📍</span>
        <span className="text-xl font-bold">MuniMap</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onRefresh} className="btn">🔄 Refresh</button>
        <button onClick={onOpenFilters} className="btn">🧰 Filters</button>
        <button onClick={onOpenSearch} className="btn">🔎 Search</button>
        <button
          onClick={onOpenArchive}
          className="rounded-md bg-green-400 px-3 py-1.5 font-semibold hover:bg-green-500"
        >
          View Archived Reports
        </button>
      </div>
    </header>
  );
}
