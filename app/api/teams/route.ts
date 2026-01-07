import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Team from "@/models/Team";
import { getIO } from "@/server/socket";

/* ✅ REQUIRED for MongoDB */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const teams = await Team.find({}).sort({ createdAt: -1 });
    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

/* ✅ CREATE TEAM (SAFE SOCKET) */
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name } = await req.json();

    const team = await Team.create({
      name,
      active: true,
      members: [],
    });

    // ✅ SAFE SOCKET EMIT
    try {
      const io = getIO();
      io.emit("team_created", team);
    } catch {
      console.warn("Socket not initialized yet");
    }

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Create team failed:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
