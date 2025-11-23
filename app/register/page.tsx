"use client";

import { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Stack,
  MenuItem,
} from "@mui/material";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    avatarUrl: "",
    role: "public",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...form };

      await axios.post("/api/auth/register", payload);

      alert("Registration successful!");
      router.push("/"); // Redirect to home page
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Create Account
      </Typography>

      <Stack spacing={3}>
        <TextField label="Full Name" name="name" onChange={handleChange} />
        <TextField label="Email" name="email" onChange={handleChange} />

        <TextField
          label="Password"
          name="password"
          type="password"
          onChange={handleChange}
        />

        <TextField label="Phone Number" name="phone" onChange={handleChange} />
        <TextField label="Avatar URL" name="avatarUrl" onChange={handleChange} />

        {/* Role Selection */}
        <TextField
          select
          label="Role"
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <MenuItem value="organizer">Organizer</MenuItem>
          <MenuItem value="public">Public</MenuItem>
        </TextField>

        <Button variant="contained" onClick={handleSubmit}>
          Register
        </Button>
      </Stack>
    </Container>
  );
}
