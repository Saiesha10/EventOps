"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  name?: string;
  role?: "organizer" | "volunteer" | "admin";
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch {
      console.error("Invalid user data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* ⏳ WAIT until user is loaded */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-200">
        Loading dashboard...
      </div>
    );
  }

  /* 🚫 BLOCK NON‑ORGANIZERS SAFELY */
  if (user?.role !== "organizer") {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-300">
        Organizer access only
      </div>
    );
  }

  /* ✅ NOW SAFE TO RENDER */
  return (
    <div className="events-page min-h-screen flex justify-center p-8">
      <div className="w-full max-w-6xl space-y-6">

        {/* HEADER */}
        <div className="glass p-6 rounded-xl flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-purple-200">
              Welcome, {user.name ?? "Organizer"} 👋
            </h1>
            <p className="text-sm text-purple-300">
              Role: Organizer
            </p>
          </div>

          <span className="text-sm px-3 py-1 rounded-full bg-purple-700 text-white">
            Online
          </span>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* EVENT MANAGEMENT */}
          <div className="glass p-6 rounded-xl">
            <h2 className="font-semibold mb-2">Event Management</h2>
            <p className="text-sm mb-3">View and manage live events</p>
            <Link
              href="/events"
              className="inline-block mt-2 text-sm text-purple-300 underline"
            >
              Open Events →
            </Link>
          </div>

          {/* TEAM MANAGEMENT */}
          <div className="glass p-6 rounded-xl">
            <h2 className="font-semibold mb-2">Team Management</h2>
            <p className="text-sm mb-3">Chat with teams in real time</p>
            <Link
              href="/chat"
              className="inline-block mt-2 text-sm text-purple-300 underline"
            >
              Open Team Chat →
            </Link>
          </div>

          {/* CREATE EVENT */}
          <div className="glass p-6 rounded-xl">
            <h2 className="font-semibold mb-2">Create Event</h2>
            <p className="text-sm mb-3">Start a live event in real time</p>
            <Link
              href="/events/create"
              className="inline-block mt-2 text-sm text-purple-300 underline"
            >
              Create Event →
            </Link>
          </div>

          {/* CREATE TEAM */}
          <div className="glass p-6 rounded-xl">
            <h2 className="font-semibold mb-2">Create Team</h2>
            <p className="text-sm mb-3">Create a team for live chat</p>
            <Link
              href="/chat/create-team"
              className="inline-block mt-2 text-sm text-purple-300 underline"
            >
              Create Team →
            </Link>
          </div>

          {/* LIVE STATUS */}
          <div className="glass p-6 rounded-xl">
            <h2 className="font-semibold mb-2">Live Status</h2>
            <p className="text-sm">🟢 Users online</p>
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="glass p-6 rounded-xl">
            <h2 className="font-semibold mb-2">Announcements</h2>
            <p className="text-sm">Live updates from organizers</p>
          </div>

        </div>
      </div>
    </div>
  );
}
