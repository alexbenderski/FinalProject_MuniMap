"use client";

export default function Tooltip({ message }: { message: string }) {
  return (
    <span className="relative group cursor-pointer text-blue-600 font-bold ml-1">
      ?
      <span className="
        absolute left-1/2 -translate-x-1/2 mt-1 
        hidden group-hover:block 
        bg-gray-900 text-white text-xs 
        rounded-md px-2 py-1 whitespace-nowrap 
        z-50 shadow-lg
      ">
        {message}
      </span>
    </span>
  );
}
