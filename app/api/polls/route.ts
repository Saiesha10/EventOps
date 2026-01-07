import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Poll, { IPoll } from "@/models/Poll";

export async function GET() {
  await dbConnect();

  const polls = await Poll.find({
    endsAt: { $gt: new Date() },
  });

  return NextResponse.json(
    polls.map((p: IPoll) => ({
      _id: p._id,
      question: p.question,
      options: p.options.map((o) => ({
        _id: o.id,
        text: o.text,
      })),
    }))
  );
}
