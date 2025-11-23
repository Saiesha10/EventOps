"use client";

import { useState } from "react";
import axios from "axios";
import { Container, TextField, Button, Typography, Stack } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post("/api/auth/login", form);

      // Save user or JWT token
      localStorage.setItem("user", JSON.stringify(res.data.user));

      alert("Login successful!");
      router.push("/live-map"); // Redirect to home page
    } catch (error: any) {
      alert(error.response?.data?.message || "Invalid login credentials");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Typography variant="h4" gutterBottom>
        Login
      </Typography>

      <Stack spacing={3}>
        <TextField label="Email" name="email" onChange={handleChange} fullWidth />

        <TextField
          label="Password"
          type="password"
          name="password"
          onChange={handleChange}
          fullWidth
        />

        <Button variant="contained" size="large" onClick={handleSubmit}>
          Login
        </Button>

        <Button variant="text" onClick={() => router.push("/register")}>
          Don’t have an account? Register
        </Button>
      </Stack>
    </Container>
  );
}
