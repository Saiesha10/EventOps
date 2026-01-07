import Event from "@/models/Event";
import dbConnect from "@/lib/dbConnect";

export function registerSocketEvents(io: any) {
  io.on("connection", (socket: any) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("event_created", async (data: any) => {
      try {
        await dbConnect();

        const event = await Event.create({
          title: data.name,
          public: true,
        });

        io.emit("event_created", {
          _id: event._id.toString(),
          title: event.title,
          startDate: event.startDate,
          venue: event.venue,
        });

        console.log("✅ Event saved & emitted");
      } catch (err) {
        console.error("❌ Event save failed", err);
      }
    });
  });
} 