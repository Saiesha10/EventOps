"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Home", path: "/" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Events", path: "/events" },
  { name: "Live Map", path: "/live-map" },
  { name: "Chat", path: "/chat" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <nav className="w-full bg-black text-white px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold tracking-wide">
        EventOps
      </Link>

      <div className="flex gap-6 items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`transition font-medium pb-1 ${
                isActive
                  ? "text-[#9b5cff] border-b-2 border-[#9b5cff]"
                  : "text-gray-300 hover:text-[#9b5cff]"
              }`}
            >
              {item.name}
            </Link>
          );
        })}

        {!isLoggedIn ? (
          <Link
            href="/login"
            className="text-gray-300 hover:text-[#9b5cff]"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={handleLogout}
            className="text-gray-300 hover:text-red-400 transition"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
