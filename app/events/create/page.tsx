"use client";
import { useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import axios from "axios"; // ✅ ADD

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!);

export default function CreateEventPage() {
  const [name, setName] = useState("");
  const router = useRouter();

  const createEvent = async () => {
    if (!name.trim()) return;

    // ✅ ADD: send all required fields
    await axios.post("/api/events", {
      title: name,
      startDate: new Date().toISOString(), // REQUIRED
      venue: {
        name: "TBA", // REQUIRED
      },
    });

    // ❌ keep socket as-is (but it does nothing now)
    socket.emit("event_created", { name });

    router.push("/events");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-6 rounded-xl w-96">
        <h2 className="mb-4 font-semibold">Create Event</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          className="w-full p-2 rounded mb-4"
        />

        <button
          onClick={createEvent}
          className="w-full bg-purple-600 py-2 rounded"
        >
          Create
        </button>
      </div>
    </div>
  );
}
