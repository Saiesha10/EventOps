import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Team from "@/models/Team";

/* ✅ REQUIRED */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { userId } = await req.json();

    const team = await Team.findByIdAndUpdate(
      params.id,
      { $addToSet: { members: userId } }, // prevents duplicates
      { new: true }
    );

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error("Add member failed:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
