"use client";

import { Button, Container, Typography, Stack } from "@mui/material";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) router.push("/login");
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 10, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        EventOps
      </Typography>

      <Stack spacing={2}>
        <Button variant="contained" onClick={() => router.push("/login")}>
          Login
        </Button>

        <Button variant="outlined" onClick={() => router.push("/register")}>
          Register
        </Button>
      </Stack>
    </Container>
  );
}
