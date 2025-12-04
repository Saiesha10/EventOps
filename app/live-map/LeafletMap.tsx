"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic imports
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const ZoomControl = dynamic(() => import("react-leaflet").then((m) => (m as any).ZoomControl), { ssr: false });

type User = any;

// 🎨 Theme & Utility Styles
// Define colors and gradients using CSS variables for a consistent theme
const themeStyles = {
  '--lilac-primary': '#8a2be2', // Blue Violet
  '--lilac-secondary': '#e6e6fa', // Lavender
  '--lilac-gradient-1': '#9370DB', // MediumPurple
  '--lilac-gradient-2': '#8A2BE2', // BlueViolet
  '--bg-color': 'rgba(255, 255, 255, 0.95)',
  '--panel-shadow': '0 8px 32px rgba(0,0,0,0.2), 0 0 16px rgba(138, 43, 226, 0.15)',
  '--border-color': 'rgba(138, 43, 226, 0.2)',
  '--gamified-radius': '16px',
  '--gamified-button-shadow': '0 4px 0 0 rgba(0, 0, 0, 0.15)',
  '--gamified-button-hover-shadow': '0 2px 0 0 rgba(0, 0, 0, 0.15)',
  '--gamified-button-active-shadow': '0 0 0 0 rgba(0, 0, 0, 0.15)',
  // Status colors - keep original for function:
  '--status-available': '#4CAF50',
  '--status-busy': '#F44336',
  '--status-on-task': '#2196F3',
  '--status-break': '#FF9800',
};

// Apply CSS variables to the root element for global use
function applyThemeStyles() {
    if (typeof window !== 'undefined') {
        Object.entries(themeStyles).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value as string);
        });
    }
}

export default function LeafletMap({ users }: { users: User[] }) {
  const [L, setL] = useState<any>(null);
  const [mapObj, setMapObj] = useState<any>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState<number | null>(null); // degrees (0..360)
  const [path, setPath] = useState<[number, number][]>([]);
  const [routeGeo, setRouteGeo] = useState<[number, number][]>([]);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [tileStyle, setTileStyle] = useState<"hybrid" | "street">("hybrid");
  const [routeMeta, setRouteMeta] = useState<{ distance?: number; duration?: number }>({});
  const [activeTarget, setActiveTarget] = useState<string | null>(null); // _id of selected user
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0); // For turn-by-turn
  const [showDirections, setShowDirections] = useState(false); // Toggle directions panel
  const [userSearch, setUserSearch] = useState(""); // Search users
  const [currentZoom, setCurrentZoom] = useState(18); // Track zoom for polyline
  const [isUsersPanelCollapsed, setIsUsersPanelCollapsed] = useState(false); // New state for collapse
  const [isDirectionsPanelCollapsed, setIsDirectionsPanelCollapsed] = useState(false); // New state for directions collapse
  const watchIdRef = useRef<number | null>(null);
  const lastRoutePointRef = useRef<[number, number] | null>(null);
  const mapRotationRef = useRef<number>(0); // current rotation degrees
  const activeUserRef = useRef<User | null>(null);

  // Apply theme styles on component mount
  useEffect(() => {
    applyThemeStyles();
  }, []);

  // Filtered users for search
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    return users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.role.toLowerCase().includes(userSearch.toLowerCase()));
  }, [users, userSearch]);

  // Tile choices
  const tileOptions: any = {
    hybrid: {
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      maxNativeZoom: 20,
      maxZoom: 23,
    },
    street_light: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      maxNativeZoom: 19,
      maxZoom: 23,
    },
    street_dark: {
      // Carto dark tiles (free)
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      maxNativeZoom: 19,
      maxZoom: 23,
    },
  };

  // Load Leaflet + fix icons
  useEffect(() => {
    import("leaflet").then((leaflet) => {
      delete (leaflet as any).Icon.Default.prototype._getIconUrl;
      (leaflet as any).Icon.Default.mergeOptions({
        iconRetinaUrl: "/marker-icon-2x.png",
        iconUrl: "/marker-icon.png",
        shadowUrl: "/marker-shadow.png",
      });
      setL(leaflet);
    });
  }, []);

  // Track zoom changes for dynamic polyline weight
  const handleZoomChange = useCallback((e: any) => {
    setCurrentZoom(e.target.getZoom());
  }, []);

  // lastRoutePoint for auto-refresh logic
  useEffect(() => {
    if (!position || routeGeo.length === 0) return;
    const [lat, lng] = position;
    if (lastRoutePointRef.current) {
      const [prevLat, prevLng] = lastRoutePointRef.current;
      const moved = Math.hypot(prevLat - lat, prevLng - lng);
      // Only refresh route if moved a significant amount (~5m)
      if (moved > 0.00004) {
        // const lastTarget = routeGeo[routeGeo.length - 1]; // This line was unused
        // If navigation is active, re-route to the target
        if (activeUserRef.current) {
          const targetCoords = activeUserRef.current.location?.coordinates;
          if (targetCoords) {
            handleRouteToUser(targetCoords[1], targetCoords[0], true, activeUserRef.current);
            lastRoutePointRef.current = [lat, lng];
          }
        }
      }
    } else {
      lastRoutePointRef.current = [lat, lng];
    }
  }, [position, routeGeo, activeUserRef]);

  // Update current step based on position (Google Maps-like)
  useEffect(() => {
    if (!position || routeSteps.length === 0 || !isNavigating) return;
    let closestIndex = currentStepIndex;
    let minDist = Infinity;

    // Check steps ahead for transition
    for (let i = currentStepIndex; i < routeSteps.length; i++) {
      const step: any = routeSteps[i];
      const mloc = step?.maneuver?.location;
      if (mloc) {
        // Note: mloc is [lng, lat] from OSRM
        const dist = Math.hypot(position[0] - mloc[1], position[1] - mloc[0]);
        // If within ~50m of a maneuver location, mark it as the current step
        if (dist < minDist && dist < 0.0005) {
          minDist = dist;
          closestIndex = i;
        }
      }
    }
    // Only update if a new step is closer than the current step and is *ahead*
    if (closestIndex !== currentStepIndex) {
        setCurrentStepIndex(closestIndex);
        // Announce new step? (e.g. text-to-speech)
        // console.log("New step:", getStepInstruction(routeSteps[closestIndex], closestIndex));
    }

  }, [position, routeSteps, isNavigating, currentStepIndex]);

  // Live GPS tracking & heading (geolocation)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const success = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // update heading from geolocation if available
      if (typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading)) {
        setHeading((pos.coords.heading + 360) % 360);
      }

      setPosition([lat, lng]);
      setPath((prev) => {
        const last = prev[prev.length - 1];
        // Only record if moved a minimum distance (~1m)
        if (!last || Math.hypot(last[0] - lat, last[1] - lng) > 0.00001) return [...prev, [lat, lng]];
        return prev;
      });

      fetch("/api/map/update-location", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, accuracy: pos.coords.accuracy }),
      }).catch(() => {});

      // while navigating or recentered, animate camera
      if (mapObj && (isNavigating || activeTarget === null)) {
        try {
          // prefer higher zoom to show clarity
          mapObj.flyTo([lat, lng], Math.max(mapObj.getZoom(), 18), { duration: 0.5 });
        } catch (e) {
          mapObj.setView([lat, lng]);
        }
      }
    };

    const id = navigator.geolocation.watchPosition(success, console.error, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    watchIdRef.current = id;
    return () => navigator.geolocation.clearWatch(id);
  }, [isNavigating, activeTarget, mapObj]);

  // Optional deviceorientation fallback for heading (some mobiles require it)
  useEffect(() => {
    const onDeviceOrientation = (ev: DeviceOrientationEvent) => {
      // alpha is rotation around z-axis in degrees in some browsers
      if (ev.absolute === true || typeof ev.alpha === "number") {
        const alpha = ev.alpha ?? null;
        if (alpha !== null && !isNaN(alpha)) {
          // convert alpha to compass heading: alpha gives rotation of device around z-axis;
          // on many devices alpha==0 when device faces north. We'll use it as heading.
          const h = (360 - alpha) % 360; // invert to match compass
          setHeading(h);
        }
      }
    };

    // some browsers require permission for deviceorientation — caller must allow
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      // @ts-ignore
      if (typeof DeviceOrientationEvent?.requestPermission === "function") {
        // iOS-like; do not request here automatically — we'll still add listener (best-effort).
        // If permission not requested, event may not fire.
      }
      window.addEventListener("deviceorientation", onDeviceOrientation);
    }
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("deviceorientation", onDeviceOrientation);
    };
  }, []);

  // apply map rotation: rotate the map pane and set CSS var for counter-rotation of markers
  useEffect(() => {
    if (!mapObj) return;
    const angle = heading ?? 0;
    // prefer map container's .leaflet-map-pane
    const mapPane = mapObj.getContainer().querySelector(".leaflet-map-pane");
    if (mapPane) {
      // rotate tile & layer pane around center
      mapPane.style.transformOrigin = "50% 50%";
      mapPane.style.transition = "transform 220ms linear";
      mapPane.style.transform = `rotate(${-angle}deg)`; // negate so arrow points forward
      // store rotation
      mapRotationRef.current = angle;
      // set CSS var so markers in their HTML can counter-rotate
      document.documentElement.style.setProperty("--map-rotation-deg", `${angle}deg`);
    }
  }, [heading, mapObj]);

  // Dynamic avatar icon creator: scales by zoom for clarity and counter-rotates using CSS var
  const createAvatarIcon = (avatar: string | null, status: string) => {
    if (!L) return undefined;
    const color = {
      available: themeStyles['--status-available'],
      busy: themeStyles['--status-busy'],
      on_task: themeStyles['--status-on-task'],
      break: themeStyles['--status-break'],
    }[status] || "gray";

    // derive base size from current zoom (so icons remain readable as user zooms)
    const zoom = currentZoom;
    const size = Math.min(96, Math.max(48, Math.round((zoom - 12) * 6 + 48)));

    // Use CSS var --map-rotation-deg to counter rotate icon contents so they appear upright
    return L.divIcon({
      className: "map-avatar-icon",
      html: `
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          border:4px solid white;overflow:hidden;position:relative;
          box-shadow:0 6px 18px rgba(0,0,0,.35);
          background:var(--lilac-secondary);display:flex;align-items:center;justify-content:center;
          transform: rotate(calc(var(--map-rotation-deg, 0deg) * 1)); /* outer rotates with map pane */
        ">
          <div style="
            width:100%;height:100%;display:flex;align-items:center;justify-content:center;
            transform: rotate(calc(var(--map-rotation-deg, 0deg) * -1)); /* keep inner upright */
          ">
            <img 
              src="${avatar || "/user.png"}" 
              referrerpolicy="no-referrer"
              onerror="this.src='/user.png'"
              style="
                width:100%;height:100%;
                object-fit:cover;
                display:block;border-radius:50%;
              "
            />
          </div>
          <span style="
            position:absolute;bottom:0px;right:0px;
            width:18px;height:18px;background:${color};
            border-radius:50%;border:4px solid white;
          "></span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [Math.round(size / 2), size],
      popupAnchor: [0, -size + 12],
    });
  };

  // Create navigation (blue arrow) icon for the current user: arrow rotates with heading using inline transform
  const createNavigatorIcon = (headingDeg: number | null) => {
    if (!L) return undefined;
    const size = 64;
    const deg = headingDeg ?? 0;
    // The wrapper stays counter-rotated to cancel map rotation; arrow inside is rotated to heading
    return L.divIcon({
      className: "navigator-icon",
      html: `
        <div style="
          width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
          transform: rotate(calc(var(--map-rotation-deg, 0deg) * -1)); /* keep marker visually aligned while map rotates */
        ">
          <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform: rotate(${deg}deg); filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
            <path d="M12 2 L18 20 L12 16 L6 20 z" fill="#1e88e5" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="8" fill="white" opacity="0.0" />
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
    });
  };

  /** ROUTING */
  const handleRouteToUser = async (tLat: number, tLng: number, silent = false, targetUser?: User) => {
    if (!position) return;
    const [sLat, sLng] = position;

    // mark navigating
    setIsNavigating(true);
    setShowDirections(true); // Show directions panel
    setIsDirectionsPanelCollapsed(false); // Ensure directions panel is open
    if (targetUser) activeUserRef.current = targetUser;

    // Use current position for start, and user's coordinates for end (OSRM takes Lng, Lat)
    const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${tLng},${tLat}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.length) {
        console.warn("No route found.");
        return;
      }

      const route = data.routes[0];
      // OSRM returns coordinates as [Lng, Lat], Leaflet expects [Lat, Lng]
      const line = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);

      setRouteGeo(line);
      setRouteSteps(route.legs[0].steps || []);
      setRouteMeta({ distance: route.distance, duration: route.duration });
      setCurrentStepIndex(0);

      if (!silent && mapObj) {
        if (route.distance < 200) {
          const mid = line[Math.floor(line.length / 2)];
          mapObj.flyTo(mid, Math.min(21, Math.max(mapObj.getZoom(), 19)), { duration: 0.7 });
        } else {
          mapObj.flyToBounds(line, { padding: [100, 100], duration: 1.2, maxZoom: 20 });
        }
      }
      lastRoutePointRef.current = position;
    } catch (e) {
      console.error("Routing error", e);
    }
  };

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setActiveTarget(null);
    setRouteGeo([]);
    setRouteSteps([]);
    setRouteMeta({});
    setCurrentStepIndex(0);
    setShowDirections(false);
    activeUserRef.current = null;
  }, []);

  // format helpers
  const formatDistance = (m: number | undefined) => {
    if (!m && m !== 0) return "";
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${Math.round(m)} m`;
  };
  const formatDuration = (s: number | undefined) => {
    if (!s && s !== 0) return "";
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours} h ${rem} min`;
  };

  // Get step instruction
  const getStepInstruction = (step: any, index: number) => {
    const maneuver = step.maneuver;
    const type = maneuver.type.replace('_', ' ');
    const modifier = maneuver.modifier ? ` ${maneuver.modifier.toLowerCase()}` : '';
    const name = step.name ? ` onto ${step.name}` : '';
    const instruction = `${index + 1}. ${type}${modifier}${name}.`;
    return instruction;
  };

  // Jump to step
  const jumpToStep = useCallback((step: any, index: number) => {
    const mloc = step?.maneuver?.location;
    if (mloc && mapObj) {
      // mloc is [lng, lat], Leaflet expects [lat, lng]
      mapObj.flyTo([mloc[1], mloc[0]], Math.max(mapObj.getZoom(), 18), { duration: 1 });
      setCurrentStepIndex(index);
    }
  }, [mapObj]);

  // dynamic polyline options based on zoom
  const polylineOptions = useMemo(() => {
    const z = currentZoom || 18;
    const weight = Math.max(3, Math.min(10, Math.round((z - 10) / 2 + 4)));
    return {
      weight,
      opacity: 0.95,
      lineCap: "round" as const,
      lineJoin: "round" as const,
      smoothFactor: 1.2,
    };
  }, [currentZoom]);

  // Recenter function (centers on current position)
  const recenter = useCallback(() => {
    if (!position || !mapObj) return;
    mapObj.flyTo(position, Math.max(mapObj.getZoom(), 18), { duration: 0.5 });
  }, [position, mapObj]);

  // Recenter on active target user
  const recenterOnTarget = useCallback(() => {
    if (!activeTarget || !mapObj) return;
    const targetUser = users.find(u => u._id === activeTarget);
    if (targetUser && targetUser.location?.coordinates) {
      const [lng, lat] = targetUser.location.coordinates;
      mapObj.flyTo([lat, lng], Math.max(mapObj.getZoom(), 18), { duration: 0.5 });
    }
  }, [activeTarget, mapObj, users]);

  // Select a user from left list -> navigate
  const navigateToUser = useCallback((u: User) => {
    const coords = u.location?.coordinates;
    if (!coords) return;
    setActiveTarget(u._id);
    // coords are [lng, lat], so target is [lat, lng]
    handleRouteToUser(coords[1], coords[0], false, u);
    // center map slightly so route and UI visible
    if (mapObj && position) {
      mapObj.flyTo(position, Math.max(mapObj.getZoom(), 17), { duration: 0.5 });
    }
  }, [mapObj, position, handleRouteToUser]);

  if (!L || !position) return <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Detecting GPS…</div>;

  // determine current street tile (light/dark) based on local time
  const currentHour = new Date().getHours();
  const isNight = !(currentHour >= 6 && currentHour <= 18);
  const streetUrl = isNight ? tileOptions.street_dark.url : tileOptions.street_light.url;
  const streetMaxNativeZoom = 19;

  // Helper for gamified button styling
  const getButtonStyles = (baseBg: string, hoverBg: string, activeBg: string) => ({
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    background: baseBg,
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: 'var(--gamified-button-shadow)',
    transition: "all 0.15s ease",
    position: 'relative' as const,
    top: '0px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Hover/Active styles for a professional press effect (managed via inline onMouseEnter/onMouseLeave/onClick)
    onMouseEnter: (e: any) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.boxShadow = 'var(--gamified-button-hover-shadow)'; },
    onMouseLeave: (e: any) => { e.currentTarget.style.background = baseBg; e.currentTarget.style.boxShadow = 'var(--gamified-button-shadow)'; e.currentTarget.style.top = '0px'; },
    onMouseDown: (e: any) => { e.currentTarget.style.background = activeBg; e.currentTarget.style.boxShadow = 'var(--gamified-button-active-shadow)'; e.currentTarget.style.top = '2px'; },
    onMouseUp: (e: any) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.boxShadow = 'var(--gamified-button-hover-shadow)'; e.currentTarget.style.top = '0px'; },
  });

  return (
    <>
      {/* Lilac Themed CSS Styles (In a style block or imported CSS file, for simplicity here, we rely on the theme utility in useEffect) */}
      
      {/* Left user list - Enhanced UI */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 10001,
        display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start",
        fontFamily: "Inter, system-ui, sans-serif", transition: "all 0.3s ease",
        maxWidth: isUsersPanelCollapsed ? "60px" : "280px",
      }}>
        {/* Collapse Button for User List */}
        <button
          onClick={() => setIsUsersPanelCollapsed(c => !c)}
          title={isUsersPanelCollapsed ? "Expand Users" : "Collapse Users"}
          style={{
            ...getButtonStyles(themeStyles['--lilac-gradient-1'], themeStyles['--lilac-primary'], '#6A5ACD'),
            width: 48, height: 48, borderRadius: "50%", padding: 0, alignSelf: 'flex-start',
            fontSize: 20, marginBottom: 8,
          }}
        >
          {isUsersPanelCollapsed ? '▶️' : '◀️'}
        </button>

        {/* User List Panel */}
        <div style={{
          width: isUsersPanelCollapsed ? 0 : 260,
          opacity: isUsersPanelCollapsed ? 0 : 1,
          overflow: 'hidden',
          background: "var(--bg-color)", padding: 12, borderRadius: themeStyles['--gamified-radius'],
          boxShadow: themeStyles['--panel-shadow'], border: `2px solid ${themeStyles['--border-color']}`,
          transition: "all 0.3s ease",
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: themeStyles['--lilac-primary'], marginBottom: 12 }}>
            👥 Squad Tracker
          </div>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${themeStyles['--border-color']}`, fontSize: 14, outline: "none",
                background: "white", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
              }}
            />
          </div>
          {filteredUsers.length === 0 && <div style={{ color: "#666", textAlign: "center", padding: 20, fontSize: 14 }}>No users found.</div>}
          <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
            {filteredUsers.map((u: User) => {
              const coords = u.location?.coordinates;
              const lat = coords?.[1];
              const lng = coords?.[0];
              const isActive = activeTarget === u._id;
              
              // Helper to determine status color
              const statusColor = {
                  available: themeStyles['--status-available'],
                  busy: themeStyles['--status-busy'],
                  on_task: themeStyles['--status-on-task'],
                  break: themeStyles['--status-break'],
              }[u.currentStatus] || "#9e9e9e";

              return (
                <div key={u._id} 
                  style={{
                    padding: 12, borderRadius: 12, marginBottom: 8,
                    background: isActive ? 'linear-gradient(90deg, #e6e6fa 0%, #fff 100%)' : "transparent",
                    border: isActive ? `2px solid ${statusColor}` : `1px solid ${themeStyles['--border-color']}`,
                    display: "flex", gap: 12, alignItems: "center", cursor: "pointer",
                    transition: "all 0.2s ease", position: "relative",
                    boxShadow: isActive ? '0 0 10px rgba(138, 43, 226, 0.1)' : 'none',
                  }} 
                  onClick={() => { if (lat && lng && mapObj) mapObj.flyTo([lat, lng], Math.max(mapObj.getZoom(), 18), { duration: 0.6 }); }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f8f9fa"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={u.avatarUrl || "/user.png"} 
                      onError={(e: any) => e.currentTarget.src = "/user.png"} 
                      style={{ 
                        width: 50, height: 50, borderRadius: 25, objectFit: "cover", 
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: "3px solid white"
                      }} 
                    />
                    <div style={{ 
                      position: "absolute", bottom: 0, right: 0, width: 14, height: 14, 
                      background: statusColor, borderRadius: "50%", border: "3px solid white" 
                    }}></div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#333", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.role} • <span style={{ color: statusColor, fontWeight: 600 }}>{u.currentStatus.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={(e) => { e.stopPropagation(); navigateToUser(u); }} 
                      title="Start Navigation"
                      style={{
                        ...getButtonStyles('#3b82f6', '#2563eb', '#1e40af'),
                        padding: "6px 8px", fontSize: 14, 
                      }}
                    >
                      🚀
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      if (lat && lng && mapObj) {
                        mapObj.flyTo([lat, lng], Math.max(mapObj.getZoom(), 18), { duration: 0.6 });
                      }
                    }} 
                      title="Center on User"
                      style={{ 
                        ...getButtonStyles('#a78bfa', '#8b5cf6', '#7c3aed'),
                        padding: "6px 8px", fontSize: 14, 
                      }}
                    >
                      🎯
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <MapContainer
        center={position}
        zoom={18}
        maxZoom={23}
        style={{ height: "100vh", width: "100%", zIndex: 1 }}
        zoomControl={false}
        whenCreated={(mapInstance) => {
          setMapObj(mapInstance);
          mapInstance.on('zoomend', handleZoomChange);
        }}
        whenUnmounted={() => {
          if (mapObj) {
            mapObj.off('zoomend', handleZoomChange);
          }
        }}
      >
        <ZoomControl position="topright" />

        {/* Tile layer chooser: hybrid or street (light/dark) */}
        {tileStyle === "hybrid" ? (
          <TileLayer
            url={tileOptions.hybrid.url}
            maxNativeZoom={tileOptions.hybrid.maxNativeZoom}
            maxZoom={tileOptions.hybrid.maxZoom}
            tileSize={256}
            detectRetina
            crossOrigin="anonymous"
            updateWhenIdle
            updateWhenZooming
            keepBuffer={14}
            noWrap
            attribution="&copy; Google"
            errorTileUrl="/tile-error.png"
          />
        ) : (
          <TileLayer
            url={streetUrl}
            maxNativeZoom={streetMaxNativeZoom}
            maxZoom={23}
            tileSize={256}
            detectRetina
            crossOrigin="anonymous"
            updateWhenIdle
            updateWhenZooming
            keepBuffer={14}
            noWrap
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            errorTileUrl="/tile-error.png"
          />
        )}

        {/* Current user navigator marker (blue arrow) */}
        {position && (
          <Marker position={position} icon={createNavigatorIcon(heading)}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* All users */}
        {filteredUsers.map((u: User) => {
          const coords = u.location?.coordinates;
          if (!coords) return null;
          const lat = coords[1];
          const lng = coords[0];
          const avatar = u.avatarUrl || "/user.png";
          return (
            <Marker
              key={u._id}
              position={[lat, lng]}
              icon={createAvatarIcon(avatar, u.currentStatus || "available")}
            >
              <Popup>
                <div style={{ minWidth: 200, fontFamily: "Inter, sans-serif" }}>
                  <b style={{ fontSize: 18, color: themeStyles['--lilac-primary'] }}>{u.name}</b><br />
                  <div style={{ margin: "4px 0" }}>Role: {u.role}<br />
                  Status: <span style={{ color: themeStyles['--status-on-task'] }}>{u.currentStatus}</span></div>
                  <button
                    style={{
                      ...getButtonStyles('#4c51bf', '#3e41a8', '#323588'),
                      marginTop: 10, padding: "8px 12px", width: "100%", fontSize: 14,
                    }}
                    onClick={() => {
                      setActiveTarget(u._id);
                      handleRouteToUser(lat, lng, false, u);
                    }}
                  >
                    Start Navigation 🚀
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route polyline and markers */}
        {routeGeo.length > 0 && (
          <>
            <Polyline 
                positions={routeGeo} 
                {...polylineOptions} 
                color={themeStyles['--lilac-primary']} // Lilac/Purple color for route
                weight={polylineOptions.weight + 2} // Make it stand out more
                dashArray="10, 5" // Optional: gives a gamified dashed look
            />
            
            {/* Start Marker */}
            <Marker position={routeGeo[0]} icon={L.divIcon({
              className: "route-end start",
              html: `<div style="background:#fff;border:3px solid #4CAF50;padding:10px;border-radius:12px;font-weight:700;color:#4CAF50;box-shadow:0 6px 16px rgba(0,0,0,0.2);font-size:14px;">🚀 Start</div>`,
              iconSize: [60, 30], iconAnchor: [30, 30]
            })} />
            
            {/* Destination Marker (last point of route) */}
            <Marker position={routeGeo[routeGeo.length - 1]} icon={L.divIcon({
              className: "route-end end",
              html: `<div style="background:linear-gradient(135deg, ${themeStyles['--lilac-gradient-1']}, ${themeStyles['--lilac-gradient-2']});border:3px solid white;padding:10px;border-radius:12px;font-weight:700;color:white;box-shadow:0 6px 16px rgba(0,0,0,0.2);font-size:14px;">🏁 Goal</div>`,
              iconSize: [80, 30], iconAnchor: [40, 30]
            })} />

            {/* Turn markers */}
            {routeSteps.map((s: any, i: number) => {
              const mloc = s?.maneuver?.location;
              if (!mloc) return null;
              const isCurrent = i === currentStepIndex;
              return <Marker key={`turn-${i}`} position={[mloc[1], mloc[0]]} icon={L.divIcon({
                className: `turn-marker ${isCurrent ? 'current' : ''}`,
                html: `<div style="width:18px;height:18px;border-radius:50%;background:${isCurrent ? '#FFD700' : '#fff'};border:4px solid ${isCurrent ? themeStyles['--lilac-primary'] : '#4CAF50'}; box-shadow: ${isCurrent ? '0 0 0 3px rgba(255, 215, 0, 0.5)' : 'none'};"></div>`,
                iconSize: [26, 26], iconAnchor: [13, 13]
              })} />;
            })}
          </>
        )}

        {/* Path traveled */}
        {path.length > 1 && (
          <Polyline positions={path} weight={4} opacity={0.6} color="#d32f2f" dashArray="8,8" lineCap="round" />
        )}
      </MapContainer>

      {/* Floating controls - Enhanced UI */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {/* Map Style Toggle Button */}
        <button onClick={() => setTileStyle((t) => t === "hybrid" ? "street" : "hybrid")}
          title={tileStyle === "hybrid" ? "Street View" : "Hybrid View"}
          style={{ 
            ...getButtonStyles('#5b21b6', '#4c1d95', '#3f2780'),
            width: 54, height: 54, borderRadius: "50%", padding: 0, fontSize: 22, alignSelf: 'flex-end',
          }}
        >
          {tileStyle === "hybrid" ? '🏙️' : '🛰️'}
        </button>

        {/* Recenter & Target Controls Panel */}
        <div style={{
          background: "var(--bg-color)", borderRadius: themeStyles['--gamified-radius'],
          boxShadow: themeStyles['--panel-shadow'], padding: 12,
          border: `2px solid ${themeStyles['--border-color']}`,
          display: "flex", gap: 8, justifyContent: "center",
          alignSelf: 'flex-end',
        }}>
          {/* Recenter You */}
          <button onClick={recenter} title="Recenter on You" style={{ 
            ...getButtonStyles('#1976d2', '#1565c0', '#0d47a1'),
            width: 48, height: 48, borderRadius: 12, fontSize: 22,
          }}>
            🎯
          </button>
          
          {/* Recenter on Target */}
          {activeTarget && (
            <button onClick={recenterOnTarget} title="Recenter on Target" style={{ 
              ...getButtonStyles('#4CAF50', '#388e3c', '#2e7d32'),
              width: 48, height: 48, borderRadius: 12, fontSize: 22,
            }}>
              🏁
            </button>
          )}

          {/* Stop Navigation */}
          {isNavigating && (
            <button onClick={stopNavigation} title="Stop Navigation" style={{ 
              ...getButtonStyles('#FF4500', '#CC3700', '#992B00'), // Gamified "Danger" color
              width: 48, height: 48, borderRadius: 12, fontSize: 22,
            }}>
              🛑
            </button>
          )}
        </div>
      </div>

      {/* Directions Panel - Enhanced UI (Bottom Right) */}
      {showDirections && (
        <div style={{
          position: "absolute", bottom: 12, right: 12, zIndex: 10000,
          display: "flex", flexDirection: "column", maxWidth: 350,
          background: "var(--bg-color)", borderRadius: themeStyles['--gamified-radius'],
          boxShadow: themeStyles['--panel-shadow'], border: `2px solid ${themeStyles['--border-color']}`,
          fontFamily: "Inter, system-ui, sans-serif",
          transition: "all 0.3s ease",
          padding: 12,
        }}>
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, 
            borderBottom: `1px solid ${themeStyles['--border-color']}`, paddingBottom: 8,
          }}>
            <h3 style={{ margin: 0, fontSize: 18, color: themeStyles['--lilac-primary'] }}>
              🗺️ Route Progress
            </h3>
            <button
              onClick={() => setIsDirectionsPanelCollapsed(c => !c)}
              title={isDirectionsPanelCollapsed ? "Expand Directions" : "Collapse Directions"}
              style={{
                ...getButtonStyles(themeStyles['--lilac-gradient-1'], themeStyles['--lilac-primary'], '#6A5ACD'),
                width: 32, height: 32, borderRadius: "50%", padding: 0, fontSize: 16,
              }}
            >
              {isDirectionsPanelCollapsed ? '▲' : '▼'}
            </button>
          </div>

          <div style={{ 
            display: isDirectionsPanelCollapsed ? 'none' : 'block',
            transition: "all 0.3s ease",
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <div style={{ fontWeight: 700, color: '#333' }}>
                Distance: <span style={{ color: themeStyles['--lilac-primary'] }}>{formatDistance(routeMeta.distance)}</span>
              </div>
              <div style={{ fontWeight: 700, color: '#333' }}>
                Duration: <span style={{ color: themeStyles['--lilac-primary'] }}>{formatDuration(routeMeta.duration)}</span>
              </div>
            </div>

            {routeSteps.length > 0 && (
              <div style={{ 
                background: themeStyles['--lilac-secondary'], padding: 10, borderRadius: 10, marginBottom: 10, 
                border: `1px solid ${themeStyles['--border-color']}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: themeStyles['--lilac-primary'] }}>
                  ➡️ Next Step:
                </div>
                <div style={{ fontSize: 14, color: '#333', marginTop: 4 }}>
                  {getStepInstruction(routeSteps[currentStepIndex], currentStepIndex)}
                </div>
                <button 
                  onClick={() => jumpToStep(routeSteps[currentStepIndex], currentStepIndex)}
                  style={{
                    ...getButtonStyles('#f44336', '#d32f2f', '#c62828'), // Red focus button
                    marginTop: 8, padding: "6px 10px", fontSize: 13,
                  }}
                >
                  Focus on Turn 📍
                </button>
              </div>
            )}

            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {routeSteps.map((s: any, i: number) => {
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={i} onClick={() => jumpToStep(s, i)}
                    style={{
                      padding: 8, borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                      background: isCurrent ? 'linear-gradient(90deg, #ffd70033 0%, #fff 100%)' : 'transparent',
                      border: isCurrent ? `1px solid #FFD700` : `1px solid transparent`,
                      transition: 'background 0.1s',
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent ? '#333' : '#666',
                    }}
                    onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = '#f8f9fa'; }}
                    onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {getStepInstruction(s, i)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}