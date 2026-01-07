"use client";

import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Send, Paperclip, Circle, Smile } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

/* ================= INTERFACES (UNCHANGED) ================= */

interface Message {
  teamId: string;
  senderName: string;
  senderId: string;
  text: string;
  isBroadcast: boolean;
  timestamp?: string;
  fileUrl?: string;
  fileType?: string;
}

interface TeamProps {
  _id: string;
  name: string;
}

interface UserProps {
  _id: string;
  name: string;
  role: string;
}

interface TeamChatProps {
  team: TeamProps;
  currentUser: UserProps;
}

/* 🔹 ADD — User interface (ONLY ADDITION) */
interface IUser {
  _id: string;
  name: string;
  role: string;
}

/* ================= SOCKET ================= */

const socket = io("http://localhost:3001");

export default function TeamChat({ team, currentUser }: TeamChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  /* 🔹 ADD — USERS STATE */
  const [users, setUsers] = useState<IUser[]>([]);

  /* 🔹 ADD — SELECTED USER STATE */
  const [selectedUser, setSelectedUser] = useState("");

  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- SOCKET SETUP (UNCHANGED) ---------------- */

  useEffect(() => {
    socket.emit("setup", currentUser._id);
    socket.emit("join_team", team._id);

    const fetchHistory = async () => {
      const res = await axios.get(`/api/messages?teamId=${team._id}`);
      setMessages(res.data);
    };
    fetchHistory();

    socket.on("message_received", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("status_update", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("typing", (data) => {
      if (data.senderId !== currentUser._id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
      }
    });

    return () => {
      socket.off("message_received");
      socket.off("status_update");
      socket.off("typing");
    };
  }, [team._id, currentUser._id]);

  /* 🔹 ADD — LOAD USERS */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await axios.get("/api/users");
        setUsers(res.data);
      } catch (err) {
        console.error("Load users failed", err);
      }
    };
    loadUsers();
  }, []);

  /* 🔹 ADD — ADD MEMBER */
  const addMember = async (userId: string) => {
    if (!userId) return;
    await axios.post(`/api/teams/${team._id}/members`, { userId });
    setSelectedUser("");
  };

  /* ---------------- AUTO SCROLL (UNCHANGED) ---------------- */

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ---------------- SEND MESSAGE (UNCHANGED) ---------------- */

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const msgData: Message = {
      teamId: team._id,
      senderName: currentUser.name,
      senderId: currentUser._id,
      text: input,
      isBroadcast: currentUser.role === "Organizer",
    };

    await axios.post("/api/messages", msgData);
    socket.emit("send_message", msgData);

    setInput("");
    setIsTyping(false);
  };

  /* ---------------- FILE UPLOAD (UNCHANGED) ---------------- */

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("teamId", team._id);
    formData.append("senderId", currentUser._id);
    formData.append("senderName", currentUser.name);

    const res = await axios.post("/api/messages/upload", formData);
    socket.emit("send_message", res.data);
  };

  const emojis = ["😀", "😂", "😍", "🔥", "🎉", "👍", "❤️", "😎"];
  const isLive = onlineUsers.includes(currentUser._id);

  /* 🔹 ADD — EMOJI CLICK HANDLER */
  const handleEmojiClick = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="glass flex flex-col w-full max-w-5xl h-[88vh] rounded-[36px] overflow-hidden text-gray-800 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">

      {/* ---------------- HEADER ---------------- */}
      <div className="p-6 bg-white/70 backdrop-blur border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            💬
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">EventOps Chat</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Team: {team.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-100 px-4 py-1.5 rounded-full">
          <Circle size={8} fill={isLive ? "#22c55e" : "#ef4444"} />
          <span className="text-[10px] font-black text-green-700 uppercase">
            Live
          </span>
        </div>
      </div>

      {/* ---------------- MESSAGES ---------------- */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f3f4f6]/80">
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUser._id;
          return (
            <motion.div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`p-5 rounded-[22px] max-w-[65%] ${
                  isMe ? "bg-purple-600 text-white" : "bg-white border"
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-bold text-gray-400">
                    {m.senderName}
                  </p>
                )}
                {m.text && <p>{m.text}</p>}
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* ---------------- INPUT ---------------- */}
      <div className="relative px-8 py-6 bg-white/70 border-t">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <Paperclip size={16} className="cursor-pointer" onClick={() => fileInputRef.current?.click()} />
          <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />

          <Smile
            size={16}
            className="cursor-pointer"
            onClick={() => setShowEmoji(!showEmoji)}
          />

          <input
            className="flex-1 bg-transparent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
          />

          <button type="submit">
            <Send size={16} />
          </button>
        </form>

        {/* 🔹 ADD — EMOJI PICKER UI */}
        {showEmoji && (
          <div className="absolute bottom-20 left-8 bg-white shadow-lg rounded-xl p-3 grid grid-cols-4 gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
