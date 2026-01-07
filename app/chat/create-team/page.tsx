"use client";
import { useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import axios from "axios";

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!);

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState("");
  const router = useRouter();

  const createTeam = async () => {
    if (!teamName.trim()) return;

    await axios.post("/api/teams", { name: teamName });

    router.push("/chat");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-6 rounded-xl w-96">
        <h2 className="mb-4 font-semibold">Create Team</h2>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team name"
          className="w-full p-2 rounded mb-4"
        />
        <button
          onClick={createTeam}
          className="w-full bg-purple-600 py-2 rounded"
        >
          Create
        </button>
      </div>
    </div>
  );
}
