// pages/api/map/stream.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import { addClient, removeClient } from "@/lib/sse";
import { verifyToken } from "@/lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Basic auth from cookie token (optional)
  try {
    const cookie = req.cookies["token"];
    const decoded = cookie ? verifyToken(cookie) : null;
    if (!decoded) {
      res.status(401).end("Unauthorized");
      return;
    }

    const id = uuidv4();
    addClient(id, res);

    // When client closes connection, remove
    req.on("close", () => {
      removeClient(id);
    });
  } catch (err) {
    res.status(500).end();
  }
}
