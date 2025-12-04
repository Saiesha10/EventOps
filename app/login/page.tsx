"use client";

import { useState } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  Box,
  InputAdornment,
  CircularProgress,
  IconButton,
  Avatar,
} from "@mui/material";
import { 
  Email as EmailIcon, 
  Lock as LockIcon, 
  Visibility, 
  VisibilityOff,
  EventAvailable as LogoIcon 
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  
  // UI States for better UX
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
        alert("Please fill in all fields");
        return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login", form);

      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Small timeout for better UX feel
      setTimeout(() => {
          alert("Login successful!");
          router.push("/live-map");
      }, 500);
      
    } catch (error: any) {
      alert(error.response?.data?.message || "Invalid login credentials");
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
        // deeply rich gradient for professional look
        background: "radial-gradient(circle at 50% 50%, #4c1d95 0%, #0f172a 100%)",
        padding: 2,
      }}
    >
      <Container maxWidth="xs">
        <Card
          elevation={12}
          sx={{
            borderRadius: 4,
            // Glassmorphism effect
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            overflow: "visible", // allows the logo avatar to pop out if needed
            position: "relative",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            
            {/* Logo / Brand Area */}
            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
              <Avatar 
                sx={{ 
                  bgcolor: "#7c3aed", 
                  width: 56, 
                  height: 56, 
                  mb: 2,
                  boxShadow: "0 4px 14px 0 rgba(124, 58, 237, 0.5)" 
                }}
              >
                <LogoIcon fontSize="large" />
              </Avatar>
              <Typography
                variant="h4"
                align="center"
                sx={{
                  fontWeight: 800,
                  background: "linear-gradient(45deg, #6d28d9, #a855f7)",
                  backgroundClip: "text",
                  textFillColor: "transparent",
                  color: "#4c1d95", // fallback
                  letterSpacing: "-0.5px"
                }}
              >
                EventOps
              </Typography>
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mt: 1, fontWeight: 500 }}
              >
                Welcome back! Please login to continue.
              </Typography>
            </Box>

            <Stack spacing={3}>
              <TextField
                label="Email Address"
                name="email"
                variant="outlined"
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "#f8fafc",
                    "& fieldset": { borderColor: "#e2e8f0" },
                    "&:hover fieldset": { borderColor: "#a855f7" },
                    "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                  },
                }}
              />

              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
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
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "#f8fafc",
                    "& fieldset": { borderColor: "#e2e8f0" },
                    "&:hover fieldset": { borderColor: "#a855f7" },
                    "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
                  },
                }}
              />

              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  fontSize: "1rem",
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
                {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
              </Button>

              <Box textAlign="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Don’t have an account?{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    onClick={() => router.push("/register")}
                    sx={{
                      color: "#7c3aed",
                      fontWeight: 700,
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Register now
                  </Typography>
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}