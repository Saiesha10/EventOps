import { NextResponse } from "next/server";

export async function GET() {
  const events = [
    {
      id: "1",
      title: "Tech Fest 2026",
      date: "2026-02-12",
      location: "Bengaluru",
      description:
        "A large-scale technology fest featuring hackathons, talks, and workshops.",
      requirements: ["Registration Desk", "Tech Support", "Event Ops"],
    },
    {
      id: "2",
      title: "Cultural Night",
      date: "2026-02-18",
      location: "Main Auditorium",
      description:
        "Music, dance performances, and live audience engagement.",
      requirements: ["Stage Management", "Crowd Control"],
    },
  ];

  return NextResponse.json(events);
}
