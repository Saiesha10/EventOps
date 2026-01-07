import { io } from "socket.io-client";

/* ✅ EXISTING CODE — DO NOT CHANGE */
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
  autoConnect: true,
});

/* =====================================================
   ✅ ADDITIONS ONLY (SAFE HELPERS)
   ===================================================== */

/* Emit when an event is created */
export const emitEventCreated = (event: {
  _id: string;
  title: string;
  startDate?: string;
  venue?: { name?: string };
}) => {
  socket.emit("event_created", event);
};

/* Listen for real-time event creation */
export const onEventCreated = (
  callback: (event: {
    _id: string;
    title: string;
    startDate?: string;
    venue?: { name?: string };
  }) => void
) => {
  socket.on("event_created", callback);
};

/* Remove listener safely */
export const offEventCreated = () => {
  socket.off("event_created");
};

export default socket;
