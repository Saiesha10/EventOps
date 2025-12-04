"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Container,
  TextField,
  Button,
  Typography,
  Stack,
  MenuItem,
  Box,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  Badge as BadgeIcon,
  Visibility,
  VisibilityOff,
  AppRegistration as RegisterIcon,
} from "@mui/icons-material";

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

  // UI States
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
        alert("Please fill in the required fields.");
        return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      await axios.post("/api/auth/register", payload);

      setTimeout(() => {
        alert("Registration successful!");
        router.push("/"); 
      }, 500);
      
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 50%, #4c1d95 0%, #0f172a 100%)",
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={12}
          sx={{
            borderRadius: 4,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            
            {/* Header Section */}
            <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
              <Avatar
                sx={{
                  bgcolor: "#7c3aed",
                  width: 56,
                  height: 56,
                  mb: 2,
                  boxShadow: "0 4px 14px 0 rgba(124, 58, 237, 0.5)",
                }}
              >
                <RegisterIcon fontSize="large" />
              </Avatar>
              <Typography
                variant="h4"
                align="center"
                sx={{
                  fontWeight: 800,
                  color: "#4c1d95",
                }}
              >
                Create Account
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Join EventOps to start managing events
              </Typography>
            </Box>

            {/* Vertical Stack Form */}
            <Stack spacing={2.5}>
              <TextField
                label="Full Name"
                name="name"
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={fieldStyle}
              />

              <TextField
                label="Email Address"
                name="email"
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={fieldStyle}
              />

              <TextField
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={fieldStyle}
              />

              <TextField
                label="Phone Number"
                name="phone"
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={fieldStyle}
              />

              <TextField
                label="Avatar URL (Optional)"
                name="avatarUrl"
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={fieldStyle}
              />

              <TextField
                select
                label="Role"
                name="role"
                value={form.role}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={fieldStyle}
              >
                <MenuItem value="organizer">Organizer</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </TextField>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                fullWidth
                size="large"
                sx={{
                  py: 1.5,
                  mt: 1, // extra margin top for separation
                  borderRadius: 3,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  textTransform: "none",
                  backgroundColor: "#7c3aed",
                  boxShadow: "0 4px 14px 0 rgba(124, 58, 237, 0.4)",
                  "&:hover": {
                    backgroundColor: "#6d28d9",
                    boxShadow: "0 6px 20px 0 rgba(124, 58, 237, 0.6)",
                  },
                }}
              >
                {loading ? <CircularProgress size={26} color="inherit" /> : "Register"}
              </Button>
            </Stack>

            {/* Footer */}
            <Box textAlign="center" mt={3}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{" "}
                <Typography
                  component="span"
                  variant="body2"
                  onClick={() => router.push("/login")}
                  sx={{
                    color: "#7c3aed",
                    fontWeight: 700,
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Log in
                </Typography>
              </Typography>
            </Box>

          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

// Reusable style object
const fieldStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    backgroundColor: "#f8fafc",
    "& fieldset": { borderColor: "#e2e8f0" },
    "&:hover fieldset": { borderColor: "#a855f7" },
    "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
  },
};