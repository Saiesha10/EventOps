"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

/* ✅ SINGLE SOCKET INSTANCE */
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
  autoConnect: false, // 🔑 important
});

type Event = {
  _id: string;
  title: string;
  startDate?: string;
  venue?: {
    name?: string;
  };
};

type PollOption = {
  _id: string;
  text: string;
};

type Poll = {
  _id: string;
  question: string;
  options: PollOption[];
};

type Announcement = {
  _id: string;
  text: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  /* ✅ UI-only vote tracking */
  const [voted, setVoted] = useState<Record<string, string>>({});

  useEffect(() => {
    /* 🔑 CONNECT SOCKET ONCE */
    if (!socket.connected) {
      socket.connect();
    }

    Promise.all([
      axios.get("/api/events"),
      axios.get("/api/polls"),
      axios.get("/api/announcements"),
    ]).then(([eventsRes, pollsRes, announcementsRes]) => {
      setEvents(eventsRes.data);
      setPolls(pollsRes.data);
      setAnnouncements(announcementsRes.data);
      setLoading(false);
    });

    /* 🔄 REAL‑TIME EVENT CREATED */
    socket.off("event_created"); // 🔑 prevent duplicate listeners
    socket.on("event_created", (event: Event) => {
      setEvents((prev) => [...prev, event]);
    });

    /* 🔄 REAL‑TIME POLL UPDATE */
    socket.off("poll_update");
    socket.on("poll_update", (data) => {
      setPolls((prev) =>
        prev.map((p) => (p._id === data._id ? data : p))
      );
    });

    /* 🔄 REAL‑TIME ANNOUNCEMENT */
    socket.off("announcement_new");
    socket.on("announcement_new", (data) => {
      setAnnouncements((prev) => [data, ...prev]);
    });

    return () => {
      socket.off("event_created");
      socket.off("poll_update");
      socket.off("announcement_new");
    };
  }, []);

  if (loading) return null;

  return (
    <div className="events-page flex gap-6 p-8 bg-gray-100 min-h-screen text-gray-900">

      {/* EVENTS */}
      <div className="flex-1 space-y-6">
        {events.map((event) => (
          <div key={event._id} className="glass p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold">{event.title}</h2>

            {event.startDate && (
              <p className="text-sm text-gray-600">
                {new Date(event.startDate).toDateString()}
              </p>
            )}

            <p className="text-sm">{event.venue?.name}</p>
          </div>
        ))}
      </div>

      {/* SIDE PANEL */}
      <div className="w-[350px] space-y-6">

        {/* POLLS */}
        <div className="glass p-5 rounded-xl shadow">
          <h3 className="font-bold mb-3">Active Polls</h3>

          {polls.length === 0 && (
            <p className="text-sm text-gray-500">No active polls</p>
          )}

          {polls.map((poll) => (
            <div key={poll._id} className="mb-4">
              <p className="font-medium mb-2">{poll.question}</p>

              {poll.options.map((opt) => {
                const isSelected = voted[poll._id] === opt._id;

                return (
                  <button
                    key={opt._id}
                    disabled={!!voted[poll._id]}
                    onClick={() => {
                      setVoted((prev) => ({
                        ...prev,
                        [poll._id]: opt._id,
                      }));

                      socket.emit("vote_poll", {
                        pollId: poll._id,
                        optionId: opt._id,
                      });
                    }}
                    className={`block w-full text-left mt-2 px-4 py-2 rounded-lg transition
                      ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300"
                      }
                      ${voted[poll._id] && !isSelected ? "opacity-60" : ""}
                    `}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ANNOUNCEMENTS */}
        <div className="glass p-5 rounded-xl shadow">
          <h3 className="font-bold mb-3">Announcements</h3>

          {announcements.length === 0 && (
            <p className="text-sm text-gray-500">No announcements</p>
          )}

          {announcements.map((a) => (
            <p key={a._id} className="text-sm mb-2">
              📢 {a.text}
            </p>
          ))}
        </div>

      </div>
    </div>
  );
}