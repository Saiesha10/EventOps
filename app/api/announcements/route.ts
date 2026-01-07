import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Announcement from "@/models/Announcement";

export async function GET() {
  await dbConnect();

  const announcements = await Announcement.find()
    .sort({ createdAt: -1 })
    .limit(5);

  return NextResponse.json(
    announcements.map(a => ({
      _id: a._id,
      text: a.text,
    }))
  );
}
