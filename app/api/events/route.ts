import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Event from "@/models/Event";
import { getIO } from "@/server/socket";

/* ✅ DO NOT TOUCH GET */
export async function GET() {
  await dbConnect();

  const events = await Event.find({ public: true })
    .sort({ startDate: 1 })
    .limit(10);

  return NextResponse.json(
    events.map(e => ({
      _id: e._id,
      title: e.title,
      startDate: e.startDate,
      venue: { name: e.venue?.name || "TBA" },
    }))
  );
}
function safeEmit(event: string, payload: any) {
  try {
    const io = getIO();
    io.emit(event, payload);
  } catch (err) {
    console.warn("⚠️ Socket not initialized yet, skipping emit");
  }
}

/* ✅ FIXED POST */
export async function POST(req: Request) {
  await dbConnect();

  const body = await req.json();

  const event = await Event.create({
    title: body.title,
    startDate: body.startDate,
    venue: body.venue,
    public: true,
  });

  /* 🔔 EMIT USING SERVER SOCKET */
  safeEmit("event_created", {
  _id: event._id.toString(),
  title: event.title,
  startDate: event.startDate,
  venue: event.venue,
});
 return NextResponse.json(event);
}