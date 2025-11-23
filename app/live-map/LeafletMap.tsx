"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// dynamic imports
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const ZoomControl = dynamic(() => import("react-leaflet").then((m) => (m as any).ZoomControl), { ssr: false });

type User = any;

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
  const watchIdRef = useRef<number | null>(null);
  const lastRoutePointRef = useRef<[number, number] | null>(null);
  const mapRotationRef = useRef<number>(0); // current rotation degrees
  const activeUserRef = useRef<User | null>(null);

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
      if (moved > 0.00004) {
        const lastTarget = routeGeo[routeGeo.length - 1];
        handleRouteToUser(lastTarget[0], lastTarget[1], true);
        lastRoutePointRef.current = [lat, lng];
      }
    } else {
      lastRoutePointRef.current = [lat, lng];
    }
  }, [position]);

  // Update current step based on position (Google Maps-like)
  useEffect(() => {
    if (!position || routeSteps.length === 0 || !isNavigating) return;
    let closestIndex = 0;
    let minDist = Infinity;
    routeSteps.forEach((step: any, index: number) => {
      const mloc = step?.maneuver?.location;
      if (mloc) {
        const dist = Math.hypot(position[0] - mloc[1], position[1] - mloc[0]);
        if (dist < minDist && dist < 0.001) { // Within ~100m
          minDist = dist;
          closestIndex = index;
        }
      }
    });
    setCurrentStepIndex(closestIndex);
  }, [position, routeSteps, isNavigating]);

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
        if (!last || last[0] !== lat || last[1] !== lng) return [...prev, [lat, lng]];
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
    const pane = mapObj.getPane ? mapObj.getPane("mapPane") || mapObj.getViewport() : null;
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
      available: "#4CAF50",
      busy: "#F44336",
      on_task: "#2196F3",
      break: "#FF9800",
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
          border:3px solid white;overflow:hidden;position:relative;
          box-shadow:0 6px 18px rgba(0,0,0,.25);
          background:#f2f2f2;display:flex;align-items:center;justify-content:center;
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
            position:absolute;bottom:6px;right:6px;
            width:14px;height:14px;background:${color};
            border-radius:50%;border:2px solid white;
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
          <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform: rotate(${deg}deg);">
            <path d="M12 2 L15 12 L12 9 L9 12 z" fill="#1976d2" stroke="#0d47a1" stroke-width="1"/>
            <circle cx="12" cy="12" r="10" fill="white" opacity="0.0" />
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
    if (targetUser) activeUserRef.current = targetUser;

    const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${tLng},${tLat}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.length) return;

      const route = data.routes[0];
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
    const modifier = maneuver.modifier ? ` ${maneuver.modifier.toLowerCase()}` : '';
    const instruction = `${index + 1}. ${maneuver.type.replace('_', ' ')}${modifier}.`;
    return instruction;
  };

  // Jump to step
  const jumpToStep = useCallback((step: any, index: number) => {
    const mloc = step?.maneuver?.location;
    if (mloc && mapObj) {
      mapObj.flyTo([mloc[1], mloc[0]], Math.max(mapObj.getZoom(), 18), { duration: 1 });
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

  // Recenter function (centers on current position and clears navigation if no target)
  const recenter = useCallback(() => {
    if (!position || !mapObj) return;
    mapObj.flyTo(position, Math.max(mapObj.getZoom(), 18), { duration: 0.5 });
    // keep navigating if there is active target
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
    handleRouteToUser(coords[1], coords[0], false, u);
    // center map slightly so route and UI visible
    if (mapObj && position) {
      mapObj.flyTo(position, Math.max(mapObj.getZoom(), 17), { duration: 0.5 });
    }
  }, [mapObj, position]);

  if (!L || !position) return <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Detecting GPS…</div>;

  // determine current street tile (light/dark) based on local time
  const currentHour = new Date().getHours();
  const isNight = !(currentHour >= 6 && currentHour <= 18);
  const streetUrl = isNight ? tileOptions.street_dark.url : tileOptions.street_light.url;
  const streetMaxNativeZoom = 19;

  return (
    <>
      {/* Left user list - Improved with search and collapsible */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 10001,
        display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", maxWidth: "280px"
      }}>
        <div style={{
          width: 260, background: "rgba(255,255,255,0.98)", padding: 12, borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333" }}>👥 People Nearby</div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #e0e0e0", fontSize: 14, outline: "none",
                  background: "white", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
                }}
              />
            </div>
          </div>
          {filteredUsers.length === 0 && <div style={{ color: "#666", textAlign: "center", padding: 20 }}>No users found</div>}
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {filteredUsers.map((u: User) => {
              const coords = u.location?.coordinates;
              const lat = coords?.[1];
              const lng = coords?.[0];
              const isActive = activeTarget === u._id;
              return (
                <div key={u._id} style={{
                  padding: 12, borderRadius: 10, marginBottom: 8,
                  background: isActive ? "#e3f2fd" : "transparent",
                  border: isActive ? "1px solid #1976d2" : "1px solid transparent",
                  display: "flex", gap: 12, alignItems: "center", cursor: "pointer",
                  transition: "all 0.2s ease", position: "relative"
                }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f8f9fa"; }}
                   onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <img src={u.avatarUrl || "/user.png"} onError={(e: any) => e.currentTarget.src = "/user.png"} style={{ width: 48, height: 48, borderRadius: 24, objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{u.role} • <span style={{ color: isActive ? "#1976d2" : "#666" }}>{u.currentStatus}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); navigateToUser(u); }} style={{ 
                      padding: "6px 12px", borderRadius: 6, border: "none", background: "#1976d2", color: "white", 
                      fontSize: 12, cursor: "pointer", boxShadow: "0 2px 4px rgba(25,118,210,0.3)",
                      transition: "all 0.2s"
                    }} onMouseEnter={(e) => e.currentTarget.style.background = "#1565c0"}
                       onMouseLeave={(e) => e.currentTarget.style.background = "#1976d2"}>
                      📍 Nav
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      if (lat && lng && mapObj) {
                        mapObj.flyTo([lat, lng], Math.max(mapObj.getZoom(), 18), { duration: 0.6 });
                      }
                    }} style={{ 
                      padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", 
                      fontSize: 12, cursor: "pointer", color: "#666", transition: "all 0.2s"
                    }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; e.currentTarget.style.borderColor = "#1976d2"; e.currentTarget.style.color = "#1976d2"; }}
                       onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#666"; }}>
                      🎯
                    </button>
                  </div>
                  {isActive && <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, background: "#4CAF50", borderRadius: "50%", boxShadow: "0 0 0 2px white" }}></div>}
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
        style={{ height: "100vh", width: "100%" }}
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
                <div style={{ minWidth: 200 }}>
                  <b style={{ fontSize: 16 }}>{u.name}</b><br />
                  Role: {u.role}<br />
                  Status: <span style={{ color: "#2196F3" }}>{u.currentStatus}</span><br />
                  <button
                    style={{
                      marginTop: 12, padding: "8px 12px", borderRadius: 6,
                      background: "#1976d2", color: "white", border: "none", cursor: "pointer",
                      width: "100%", fontSize: 14, transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#1565c0"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#1976d2"}
                    onClick={() => {
                      setActiveTarget(u._id);
                      handleRouteToUser(lat, lng, false, u);
                    }}
                  >
                    Start Navigation
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route polyline */}
        {routeGeo.length > 0 && (
          <>
            <Polyline positions={routeGeo} {...polylineOptions} color="#1e88e5" />
            <Marker position={routeGeo[0]} icon={L.divIcon({
              className: "route-end start",
              html: `<div style="background:#fff;border:2px solid #1e88e5;padding:8px;border-radius:8px;font-weight:700;color:#1e88e5;box-shadow:0 2px 8px rgba(0,0,0,0.1);">🚀 Start</div>`,
              iconSize: [60, 30], iconAnchor: [30, 30]
            })} />
            <Marker position={routeGeo[routeGeo.length - 1]} icon={L.divIcon({
              className: "route-end end",
              html: `<div style="background:#fff;border:2px solid #1e88e5;padding:8px;border-radius:8px;font-weight:700;color:#1e88e5;box-shadow:0 2px 8px rgba(0,0,0,0.1);">🏁 Destination</div>`,
              iconSize: [80, 30], iconAnchor: [40, 30]
            })} />
            {routeSteps.map((s: any, i: number) => {
              const mloc = s?.maneuver?.location;
              if (!mloc) return null;
              const isCurrent = i === currentStepIndex;
              return <Marker key={`turn-${i}`} position={[mloc[1], mloc[0]]} icon={L.divIcon({
                className: `turn-marker ${isCurrent ? 'current' : ''}`,
                html: `<div style="width:10px;height:10px;border-radius:50%;background:${isCurrent ? '#ff9800' : '#fff'};border:2px solid #1e88e5; box-shadow: ${isCurrent ? '0 0 0 3px #ff9800' : 'none'};"></div>`,
                iconSize: [14, 14], iconAnchor: [7, 7]
              })} />;
            })}
          </>
        )}

        {/* Path traveled */}
        {path.length > 1 && (
          <Polyline positions={path} weight={3} opacity={0.6} color="#d32f2f" dashArray="5,5" />
        )}
      </MapContainer>

      {/* Floating controls - Improved with icons, better layout, and target recenter */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 9999,
        background: "rgba(255,255,255,0.98)", borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)", padding: 12,
        fontFamily: "Inter, system-ui, sans-serif", minWidth: 200, border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => mapObj?.zoomIn()} title="Zoom In" style={{ 
            width: 40, height: 40, borderRadius: 8, border: "none", background: "#f8f9fa", 
            cursor: "pointer", fontSize: 18, fontWeight: "bold", color: "#333",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s"
          }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.transform = "scale(1.05)"; }}
             onMouseLeave={(e) => { e.currentTarget.style.background = "#f8f9fa"; e.currentTarget.style.transform = "scale(1)"; }}>
            ➕
          </button>
          <button onClick={() => mapObj?.zoomOut()} title="Zoom Out" style={{ 
            width: 40, height: 40, borderRadius: 8, border: "none", background: "#f8f9fa", 
            cursor: "pointer", fontSize: 18, fontWeight: "bold", color: "#333",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s"
          }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.transform = "scale(1.05)"; }}
             onMouseLeave={(e) => { e.currentTarget.style.background = "#f8f9fa"; e.currentTarget.style.transform = "scale(1)"; }}>
            ➖
          </button>
          <button onClick={recenter} title="Recenter on You" style={{ 
            width: 40, height: 40, borderRadius: 8, border: "none", background: "#1976d2", 
            cursor: "pointer", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s"
          }} onMouseEnter={(e) => { e.currentTarget.style.background = "#1565c0"; e.currentTarget.style.transform = "scale(1.05)"; }}
             onMouseLeave={(e) => { e.currentTarget.style.background = "#1976d2"; e.currentTarget.style.transform = "scale(1)"; }}>
            📍
          </button>
          {activeTarget && (
            <button onClick={recenterOnTarget} title="Recenter on Target" style={{ 
              width: 40, height: 40, borderRadius: 8, border: "none", background: "#4CAF50", 
              cursor: "pointer", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s"
            }} onMouseEnter={(e) => { e.currentTarget.style.background = "#388e3c"; e.currentTarget.style.transform = "scale(1.05)"; }}
               onMouseLeave={(e) => { e.currentTarget.style.background = "#4CAF50"; e.currentTarget.style.transform = "scale(1)"; }}>
              🏁
            </button>
          )}
          <button onClick={() => {
            // toggle between 'hybrid' and 'street'
            setTileStyle((t) => t === "hybrid" ? "street" : "hybrid");
          }} title={tileStyle === "hybrid" ? "Street View" : "Hybrid View"} style={{ 
            width: 40, height: 40, borderRadius: 8, border: "none", background: "#f8f9fa", 
            cursor: "pointer", fontSize: 16, color: "#333",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s"
          }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.transform = "scale(1.05)"; }}
             onMouseLeave={(e) => { e.currentTarget.style.background = "#f8f9fa"; e.currentTarget.style.transform = "scale(1)"; }}>
            {tileStyle === "hybrid" ? "🗺️" : "🛰️"}
          </button>
        </div>

        <button onClick={() => {
          // clear navigation
          setActiveTarget(null);
          setRouteGeo([]);
          setRouteSteps([]);
          setRouteMeta({});
          setIsNavigating(false);
          setShowDirections(false);
          setCurrentStepIndex(0);
          activeUserRef.current = null;
        }} style={{ 
          width: "100%", padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer", 
          background: "#f44336", color: "white", fontSize: 14, fontWeight: 500,
          marginBottom: 12, transition: "all 0.2s"
        }} onMouseEnter={(e) => { e.currentTarget.style.background = "#d32f2f"; e.currentTarget.style.transform = "scale(1.02)"; }}
           onMouseLeave={(e) => { e.currentTarget.style.background = "#f44336"; e.currentTarget.style.transform = "scale(1)"; }}>
          ⏹️ Stop Navigation
        </button>

        {/* route meta - Improved with icons and better styling */}
        {routeGeo.length > 0 && (
          <div style={{ fontSize: 13, color: "#333", background: "#e3f2fd", padding: 12, borderRadius: 8, border: "1px solid #bbdefb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>📏</span><strong>Distance:</strong> {formatDistance(routeMeta.distance)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>⏱️</span><strong>ETA:</strong> {formatDuration(routeMeta.duration)}
            </div>
            <div style={{ marginBottom: 8, fontSize: 11, color: "#666", textAlign: "center", background: "#fff3e0", padding: 6, borderRadius: 4, border: "1px solid #ffe0b2" }}>
              Next: {getStepInstruction(routeSteps[currentStepIndex], currentStepIndex)}
            </div>
            <button onClick={() => setShowDirections(!showDirections)} style={{ 
              width: "100%", marginBottom: 4, padding: "6px 8px", borderRadius: 4, border: "1px solid #1976d2", 
              background: "transparent", color: "#1976d2", fontSize: 12, cursor: "pointer", transition: "all 0.2s"
            }} onMouseEnter={(e) => { e.currentTarget.style.background = "#1976d2"; e.currentTarget.style.color = "white"; }}
               onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1976d2"; }}>
              {showDirections ? "Hide" : "Show"} Directions
            </button>
          </div>
        )}
      </div>

      {/* Directions Panel - Google Maps-like turn-by-turn with prev/next */}
      {showDirections && routeSteps.length > 0 && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          width: "90%", maxWidth: 400, maxHeight: "50vh", background: "rgba(255,255,255,0.98)",
          borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden",
          zIndex: 9998, border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ padding: 12, background: "linear-gradient(135deg, #1976d2, #2196f3)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>🧭 Directions ({routeSteps.length} steps)</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))} style={{ padding: "4px 8px", borderRadius: 4, background: "rgba(255,255,255,0.2)", color: "white", border: "none", cursor: "pointer" }}>← Prev</button>
              <button onClick={() => setCurrentStepIndex(Math.min(routeSteps.length - 1, currentStepIndex + 1))} style={{ padding: "4px 8px", borderRadius: 4, background: "rgba(255,255,255,0.2)", color: "white", border: "none", cursor: "pointer" }}>Next →</button>
            </div>
          </div>
          <div style={{ maxHeight: "40vh", overflowY: "auto", padding: 8 }}>
            {routeSteps.map((step: any, index: number) => {
              const isCurrent = index === currentStepIndex;
              const mloc = step?.maneuver?.location;
              return (
                <div key={`step-${index}`} style={{
                  padding: 12, marginBottom: 8, borderRadius: 8,
                  background: isCurrent ? "#fff3e0" : "#f8f9fa",
                  border: isCurrent ? "2px solid #ff9800" : "1px solid #e9ecef",
                  cursor: "pointer", transition: "all 0.2s", position: "relative"
                }} onClick={() => jumpToStep(step, index)} onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = "#e3f2fd"; }}
                   onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "#f8f9fa"; }}>
                  <div style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "#e65100" : "#333", fontSize: isCurrent ? 14 : 13 }}>
                    {getStepInstruction(step, index)}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {formatDistance(step.distance)} • {formatDuration(step.duration || 0)}
                  </div>
                  {isCurrent && <div style={{ position: "absolute", top: 4, right: 8, width: 6, height: 6, background: "#ff9800", borderRadius: "50%" }}></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CSS overrides & CSS var for rotation handling */}
      <style>{`
        :root { --map-rotation-deg: 0deg; }
        .map-avatar-icon img { display:block; border-radius:50%; }
        .leaflet-container { background: #f6f7f9; }
        /* ensure marker icons are positioned correctly after rotating the map pane */
        .leaflet-marker-pane { transform-origin: 50% 50%; }
        /* fix z-index for our navigator */
        .navigator-icon { z-index: 9998 !important; }
        .turn-marker.current { animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
        /* Smooth scroll for user list */
        .leaflet-container::-webkit-scrollbar { width: 6px; }
        .leaflet-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
        .leaflet-container::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
        .leaflet-container::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
      `}</style>
    </>
  );
}