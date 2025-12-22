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
    <header className="sticky top-0 z-30 flex items-center justify-center border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2.5 shadow-lg relative">
      {/* Center: Title */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">MuniMap Dashboard</h1>
          <p className="text-sm text-blue-100">Municipal Infrastructure Management System</p>
        </div>
      </div>

      {/* Right: Buttons */}
      <div className="absolute right-6 flex gap-3">
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md hover:shadow-lg transition-all">
          🔄 Refresh
        </button>
        <button onClick={onOpenFilters} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md hover:shadow-lg transition-all">
          🧰 Filters
        </button>
        <button onClick={onOpenSearch} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md hover:shadow-lg transition-all">
          🔎 Search
        </button>
        <button
          onClick={onOpenArchive}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 shadow-md hover:shadow-lg transition-all"
        >
          View Archived Reports
        </button>
      </div>
    </header>
  );
}
