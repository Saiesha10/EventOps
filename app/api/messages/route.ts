import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";

// Handle POST request to save a new message
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // Create the message in MongoDB
    const newMessage = await Message.create({
      teamId: body.teamId,
      senderId: body.senderId,
      senderName: body.senderName,
      text: body.text,
      isBroadcast: body.isBroadcast,
      timestamp: new Date()
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("API Message Error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

// Optional: Handle GET request to fetch history for a specific team
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    const messages = await Message.find({ teamId }).sort({ timestamp: 1 });
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}