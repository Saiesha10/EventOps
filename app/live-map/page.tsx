"use client";

import { useEffect, useState } from "react";
import LeafletMap from "./LeafletMap";

export default function LiveMapPage() {
  const [users, setUsers] = useState([]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/map/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    }
  };

  useEffect(() => {
    loadUsers();
    const id = setInterval(loadUsers, 3000);
    return () => clearInterval(id);
  }, []);

  return <LeafletMap users={users} />;
}
