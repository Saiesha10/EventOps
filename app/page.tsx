"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Stack,
  Chip,
  Box,
} from "@mui/material";
import { useRouter } from "next/navigation";
import "./sparkles.css";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) return null;

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* ✨ Sparkles */}
      <div className="sparkles" />

      <Container maxWidth="md" sx={{ mt: 10, mb: 10 }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            background:
              "linear-gradient(135deg, rgba(155,92,255,0.18), rgba(0,0,0,0.6))",
            border: "1px solid rgba(155,92,255,0.35)",
            boxShadow: "0 0 80px rgba(155,92,255,0.15)",
          }}
        >
          <Stack spacing={3}>
            {/* Header */}
            <Typography
              variant="h4"
              sx={{ color: "#caa9ff", fontWeight: 600 }}
            >
              Welcome, {user.name || "hihihi"} ✨
            </Typography>

            <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
              {user.email}
            </Typography>

            <Chip
              label={user.role || "Organizer"}
              sx={{
                width: "fit-content",
                bgcolor: "rgba(155,92,255,0.25)",
                color: "#caa9ff",
                fontWeight: 500,
              }}
            />

            <Typography
              sx={{
                color: "rgba(255,255,255,0.75)",
                maxWidth: "700px",
              }}
            >
              This is your personal overview. Manage events, collaborate with
              teams, and track live activity — all in real time.
            </Typography>

            {/* ✦ Secondary content (NO GRID ISSUES) */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, 1fr)",
                },
                gap: 3,
                mt: 2,
              }}
            >
              {[
                { title: "Events", value: "Live & Upcoming" },
                { title: "Teams", value: "Connected" },
                { title: "Status", value: "Online" },
              ].map((item) => (
                <Paper
                  key={item.title}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(155,92,255,0.25)",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{ color: "#9b5cff", fontWeight: 600 }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{ color: "rgba(255,255,255,0.6)", mt: 1 }}
                  >
                    {item.value}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}
