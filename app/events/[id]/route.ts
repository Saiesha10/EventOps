import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Event from "@/models/Event";
import { getIO } from "@/server/socket";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const event = await Event.findByIdAndDelete(params.id);

  if (!event) {
    return NextResponse.json(
      { message: "Event not found" },
      { status: 404 }
    );
  }

  // 🔔 Notify all clients
  const io = getIO();
  io.emit("event_deleted", { _id: params.id });

  return NextResponse.json({ success: true });
} 