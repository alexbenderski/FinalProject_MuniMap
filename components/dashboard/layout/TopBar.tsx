"use client";
import { logOut } from "@/lib/client/auth-client";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleLogout = async () => {
    await logOut();
    router.replace("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 shadow-lg">
      <div className="flex items-center justify-between gap-6">
        {/* Left: Title */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">MuniMap Dashboard</h1>
          <p className="text-xs lg:text-sm text-blue-100">Municipal Infrastructure Management System</p>
        </div>

        {/* Right: Buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
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
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 shadow-md hover:shadow-lg transition-all"
        >
          🚪 Logout
        </button>
      </div>
    </header>
  );
}
