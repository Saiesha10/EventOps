let ioInstance = null;

function initSocket(httpServer) {
  const { Server } = require("socket.io");

  if (!ioInstance) {
    ioInstance = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    console.log("✅ Socket.IO initialized");
  }

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("❌ Socket.io not initialized");
  }
  return ioInstance;
}

module.exports = { initSocket, getIO };
