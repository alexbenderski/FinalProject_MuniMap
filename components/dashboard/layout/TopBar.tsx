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
    <header className="sticky top-0 z-30 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-2 sm:px-4 lg:px-6 py-2 shadow-lg w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 max-w-full">
        {/* Left: Title */}
        <div className="flex-shrink min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold tracking-tight truncate">MuniMap</h1>
          <p className="text-[10px] sm:text-xs lg:text-sm text-blue-100 hidden sm:block truncate">Municipal Infrastructure</p>
        </div>

        {/* Right: Buttons */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
        <button onClick={onRefresh} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md text-xs sm:text-sm whitespace-nowrap">
          🔄 <span className="hidden md:inline">Refresh</span>
        </button>
        <button onClick={onOpenFilters} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md text-xs sm:text-sm whitespace-nowrap">
          🧰 <span className="hidden md:inline">Filters</span>
        </button>
        <button onClick={onOpenSearch} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md text-xs sm:text-sm whitespace-nowrap">
          🔎 <span className="hidden md:inline">Search</span>
        </button>
        <button
          onClick={onOpenArchive}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 shadow-md text-xs sm:text-sm whitespace-nowrap hidden sm:flex"
        >
          📋 <span className="hidden lg:inline">Archive</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 shadow-md text-xs sm:text-sm whitespace-nowrap"
        >
          🚪 <span className="hidden md:inline">Logout</span>
        </button>
      </div>
      </div>
    </header>
  );
}
