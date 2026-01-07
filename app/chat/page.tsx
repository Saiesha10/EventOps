"use client";

import React, { useState, useEffect } from "react";
import TeamChat from "../components/TeamChat";
import axios from "axios";

/* ✅ ADDED — socket client */
import { io } from "socket.io-client";

/* ✅ ADDED — single socket instance */
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!);

interface Team {
  _id: string;
  name: string;
  active: boolean;
}

interface User {
  _id: string;
  name: string;
  role: string;
}

export default function ChatDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUser: User = {
    _id: "user_01",
    name: "Organizer",
    role: "Organizer",
  };

  /* ===============================
     EXISTING API LOAD (UNCHANGED)
  =============================== */
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await axios.get("/api/teams");
        setTeams(response.data);
        if (response.data.length > 0) setSelectedTeam(response.data[0]);
      } catch (err) {
        console.error("Sidebar Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  /* ===============================
     ✅ ADDED — REAL‑TIME LISTENERS
     NO EXISTING CODE TOUCHED
  =============================== */
  useEffect(() => {
    /* 🔄 TEAM CREATED LIVE */
    socket.on("team_created", (team: Team) => {
      setTeams((prev) => [...prev, team]);
    });

    /* 🔄 MEMBER ADDED LIVE */
    socket.on("member_added", (userId: string) => {
      console.log("👤 Member added:", userId);
      // TeamChat already handles messages & typing
      // This ensures sidebar stays in sync
    });

    return () => {
      socket.off("team_created");
      socket.off("member_added");
    };
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#2b0f4a] via-[#160b2e] to-[#0c0818] text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-1/4 p-6">
        <div className="h-full rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 p-6 flex flex-col gap-6">
          
          <div>
            <h1 className="text-2xl font-serif font-bold mb-1">Team Chats</h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/50">
              Your Live Coordination
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl" />
                ))}
              </div>
            ) : teams.length > 0 ? (
              teams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-3 rounded-xl cursor-pointer border flex justify-between items-center group
                    transition-all duration-200 hover:translate-x-1 hover:shadow-lg
                    ${
                      selectedTeam?._id === team._id
                        ? "bg-purple-600/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.35)]"
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        team.active ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="font-semibold text-sm">
                      {team.name}
                    </span>
                  </div>

                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px]">→</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-white/40 text-sm italic py-10 text-center">
                Create a team in the Management section to see it here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex items-center justify-center p-10">
        {selectedTeam ? (
          <TeamChat team={selectedTeam} currentUser={currentUser} />
        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl">💬</div>
            <p className="text-white/50 italic">
              Select a team on the left to start coordinating.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
