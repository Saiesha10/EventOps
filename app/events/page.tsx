"use client";

import {
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  Box,
  Divider,
} from "@mui/material";
import { useEffect, useState } from "react";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  requirements: string[];
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <Container sx={{ mt: 10 }}>
        <Typography sx={{ color: "#caa9ff" }}>
          Loading events...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 8, mb: 10 }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ color: "#caa9ff", fontWeight: 600 }}>
          Event Feed
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
          Discover upcoming events and volunteer opportunities
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2.5fr 1fr" },
          gap: 4,
        }}
      >
        {/* MAIN FEED */}
        <Stack spacing={4}>
          {events.map((event) => (
            <Paper
              key={event.id}
              sx={{
                p: 4,
                borderRadius: 4,
                background:
                  "linear-gradient(135deg, rgba(155,92,255,0.15), rgba(0,0,0,0.6))",
                border: "1px solid rgba(155,92,255,0.3)",
              }}
            >
              <Stack spacing={2}>
                <Typography variant="h5" sx={{ color: "#caa9ff" }}>
                  {event.title}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
                  📍 {event.location} • 📅 {event.date}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.75)" }}>
                  {event.description}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {event.requirements.map((req) => (
                    <Chip
                      key={req}
                      label={req}
                      sx={{
                        bgcolor: "rgba(155,92,255,0.25)",
                        color: "#caa9ff",
                      }}
                    />
                  ))}
                </Stack>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Stack direction="row" spacing={2}>
                  <Button
                    sx={{
                      px: 3,
                      py: 1.2,
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      color: "#0b0714",
                      background:
                        "linear-gradient(135deg, #9b5cff, #caa9ff)",
                      boxShadow: "0 0 20px rgba(155,92,255,0.45)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #a970ff, #d4bfff)",
                      },
                    }}
                  >
                    Register as Volunteer
                  </Button>

                  <Button
                    sx={{
                      px: 3,
                      py: 1.2,
                      borderRadius: 2,
                      textTransform: "none",
                      color: "#caa9ff",
                      border: "1px solid rgba(155,92,255,0.4)",
                      background: "rgba(155,92,255,0.08)",
                    }}
                  >
                    View Details
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>

        {/* SIDE PANEL */}
        <Stack spacing={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: "rgba(155,92,255,0.1)",
              border: "1px solid rgba(155,92,255,0.3)",
            }}
          >
            <Typography sx={{ color: "#9b5cff", fontWeight: 600 }}>
              Active Polls
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.6)", mt: 1 }}>
              No active polls
            </Typography>
          </Paper>

          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: "rgba(155,92,255,0.1)",
              border: "1px solid rgba(155,92,255,0.3)",
            }}
          >
            <Typography sx={{ color: "#9b5cff", fontWeight: 600 }}>
              Announcements
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.6)", mt: 1 }}>
              No announcements yet
            </Typography>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}
