const { createServer } = require("http");


const mongoose = require("mongoose");
require("dotenv").config();

const Poll = require("./models/Poll");
const { initSocket } = require("./server/socket");
const { registerSocketEvents } = require("./socketEvents");
const httpServer = createServer();
const io = initSocket(httpServer);

// Store userId -> socketId
let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 New socket connected:", socket.id);

  /* USER SETUP */
  socket.on("setup", (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("status_update", Array.from(onlineUsers.keys()));
  });

  /* TEAM JOIN */
  socket.on("join_team", (teamId) => {
    socket.join(teamId);
  });

  /* CHAT */
  socket.on("send_message", (data) => {
    io.to(data.teamId).emit("message_received", {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });

  /* LIVE POLLS */
  socket.on("vote_poll", async ({ pollId, optionId }) => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const poll = await Poll.findById(pollId);
      if (!poll) return;

      const option = poll.options.find((o) => o.id === optionId);
      if (!option) return;

      option.votes += 1;
      await poll.save();

      io.emit("poll_update", {
        _id: poll._id,
        question: poll.question,
        options: poll.options.map((o) => ({
          _id: o.id,
          text: o.text,
          votes: o.votes,
        })),
      });
    } catch (err) {
      console.error("❌ Poll vote error:", err);
    }
  });

  /* ANNOUNCEMENTS */
  socket.on("new_announcement", (data) => {
    io.emit("announcement_new", data);
  });

  /* ✅ REAL‑TIME EVENTS */
  socket.on("event_created", (event) => {
    console.log("📢 New event created:", event.title);
    io.emit("event_created", event);
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("status_update", Array.from(onlineUsers.keys()));
  });
});

httpServer.listen(3001, () => {
  console.log("🚀 Socket server running on port 3001");
});