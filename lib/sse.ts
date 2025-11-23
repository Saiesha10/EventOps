// lib/sse.ts
type Client = {
  id: string;
  res: any;
};

const clients: Client[] = [];

export function addClient(id: string, res: any) {
  clients.push({ id, res });
  // keep the connection alive
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");
}

export function removeClient(id: string) {
  const idx = clients.findIndex((c) => c.id === id);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcastEvent(event: string, payload: any) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((c) => {
    try {
      c.res.write(data);
    } catch (err) {
      // ignore write errors
    }
  });
}
