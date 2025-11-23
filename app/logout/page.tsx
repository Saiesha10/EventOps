"use client";

import { useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const doLogout = async () => {
      try {
        // optional if you have an API logout route
        await axios.get("/api/auth/logout").catch(() => {});

        localStorage.removeItem("user");

        router.push("/login");
      } catch (error) {
        router.push("/login");
      }
    };

    doLogout();
  }, []);

  return <p style={{ padding: "20px" }}>Logging out...</p>;
}
