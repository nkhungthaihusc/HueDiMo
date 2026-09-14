"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import type { MapMouseEvent } from "maplibre-gl";
import type { Place } from "@/lib/types";
import { HUE_CENTER } from "@/lib/data/places";
import { getCategory } from "@/lib/data/categories";
import { getReverseGeocode } from "@/lib/api/reverse-geocode";

const GOONG_STYLE = "https://tiles.goong.io/assets/goong_map_web.json";


interface UserLocationCoord {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  address?: string;
}

interface MapViewProps {
  selectedId: string | null;
  visiblePlaces: Place[];
  onSelect: (place: Place) => void;
  isAddMode?: boolean;
  addPosition?: { lat: number; lng: number } | null;
  onMapClick?: (coord: { lat: number; lng: number }) => void;
  routePlaces?: Place[];
  focusRouteToken?: number;
  onUserLocationChange?: (location: { lat: number; lng: number; accuracy?: number; address?: string } | null) => void;
  hideControls?: boolean;
}

function withApiKey(url: string, apiKey?: string): string {
  if (!apiKey) return url;
  if (url.includes("api_key=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}api_key=${apiKey}`;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildUserLocationPopupHtml(params: {
  address?: string;
  accuracy?: number;
  latitude: number;
  longitude: number;
  isLoadingAddress?: boolean;
}): string {
  const { address, accuracy, latitude, longitude, isLoadingAddress } = params;

  return `
    <div style="font-size: 12px; line-height: 1.45; padding: 5px 3px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; max-width: 260px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
        <div style="color: #2563eb; font-weight: 700; display: flex; align-items: center; gap: 5px; font-size: 12px;">
          <span>📍</span> Vị trí của bạn
        </div>
        <span style="font-size: 10px; color: #16a34a; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1px 6px; border-radius: 9999px;">
          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background-color: #22c55e;"></span>
          Trực tiếp
        </span>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 7px 9px; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">
            Địa chỉ hiện tại
          </span>
          <span style="font-size: 10px;">🏠</span>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${
            address
              ? address
              : isLoadingAddress
              ? '<span style="color: #64748b; font-weight: 400; font-style: italic;">Đang xác định địa chỉ...</span>'
              : '<span style="color: #94a3b8; font-weight: 400; font-style: italic;">Đang cập nhật...</span>'
          }
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; padding: 0 2px;">
        <span>Độ chính xác: ~${Math.round(accuracy || 10)}m</span>
        <span style="font-family: monospace; color: #94a3b8; font-size: 9px;">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</span>
      </div>
    </div>
  `;
}

function createUserMarkerElement(): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "user-location-wrap";
  wrap.title = "Bấm để xem địa chỉ cụ thể & vị trí thời gian thực của bạn";
  wrap.style.cursor = "pointer";

  const pulse = document.createElement("div");
  pulse.className = "user-location-pulse";

  const dot = document.createElement("div");
  dot.className = "user-location-dot";

  const heading = document.createElement("div");
  heading.className = "user-location-heading";
  heading.style.display = "none";

  wrap.appendChild(pulse);
  wrap.appendChild(dot);
  wrap.appendChild(heading);
  return wrap;
}

function createAddLocationMarkerElement(): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "add-location-wrap";
  wrap.title = "Kéo hoặc bấm vị trí khác trên bản đồ để thay đổi vị trí ghim";

  const pulse = document.createElement("div");
  pulse.className = "add-location-pulse";

  const pin = document.createElement("div");
  pin.className = "add-location-pin";
  pin.innerHTML = `
    <div class="add-location-pin-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
    <div class="add-location-badge">📍 Vị trí mới</div>
  `;

  wrap.appendChild(pulse);
  wrap.appendChild(pin);
  return wrap;
}

export default function MapView({
  selectedId,
  visiblePlaces,
  onSelect,
  isAddMode = false,
  addPosition = null,
  onMapClick,
  routePlaces,
  focusRouteToken = 0,
  onUserLocationChange,
  hideControls = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const addModeRef = useRef(false);
  const addMarkerRef = useRef<Marker | null>(null);

  // Tracking Real-time Geolocation refs & states
  const watchIdRef = useRef<number | null>(null);
  const isFollowingRef = useRef(true);
  const userMarkerRef = useRef<Marker | null>(null);
  const userCoordsRef = useRef<UserLocationCoord | null>(null);
  const onUserLocationChangeRef = useRef(onUserLocationChange);
  const onMapClickRef = useRef(onMapClick);

  const userAddressRef = useRef<string | null>(null);
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isFetchingAddressRef = useRef<boolean>(false);

  const [userLocation, setUserLocation] = useState<UserLocationCoord | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "active" | "denied" | "error" | "unsupported">("idle");
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onUserLocationChangeRef.current = onUserLocationChange;
  }, [onUserLocationChange]);

  // Hàm khởi tạo và duy trì Geolocation watch
  const startLocationWatch = useCallback((follow = true) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsStatus("unsupported");
      return;
    }

    setGpsStatus("requesting");
    setIsFollowing(follow);
    isFollowingRef.current = follow;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    let isFirstFly = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const coords: UserLocationCoord = {
          lat: latitude,
          lng: longitude,
          accuracy,
          heading: typeof heading === "number" && !isNaN(heading) ? heading : undefined,
          address: userAddressRef.current || undefined,
        };

        userCoordsRef.current = coords;
        setUserLocation(coords);
        setGpsStatus("active");
        setShowPermissionModal(false);
        onUserLocationChangeRef.current?.({
          lat: latitude,
          lng: longitude,
          accuracy,
          address: userAddressRef.current || undefined,
        });

        const map = mapRef.current;
        if (!map) return;

        // Kiểm tra xem cần cập nhật địa chỉ ngược không (chưa có địa chỉ hoặc đã di chuyển > 30m)
        const distFromLast = lastGeocodedCoordsRef.current
          ? calculateDistanceMeters(
              lastGeocodedCoordsRef.current.lat,
              lastGeocodedCoordsRef.current.lng,
              latitude,
              longitude
            )
          : Infinity;

        const shouldFetchAddress = !userAddressRef.current || distFromLast > 30;

        if (shouldFetchAddress && !isFetchingAddressRef.current) {
          isFetchingAddressRef.current = true;
          getReverseGeocode(latitude, longitude)
            .then((data) => {
              if (data?.address) {
                userAddressRef.current = data.address;
                lastGeocodedCoordsRef.current = { lat: latitude, lng: longitude };

                // Cập nhật lại HTML của Popup nếu Marker đã tồn tại
                if (userMarkerRef.current) {
                  const currentPopup = userMarkerRef.current.getPopup();
                  if (currentPopup) {
                    currentPopup.setHTML(
                      buildUserLocationPopupHtml({
                        address: data.address,
                        accuracy,
                        latitude,
                        longitude,
                        isLoadingAddress: false,
                      })
                    );
                  }
                }

                // Cập nhật coords và gọi callback
                setUserLocation((prev) => (prev ? { ...prev, address: data.address } : prev));
                onUserLocationChangeRef.current?.({
                  lat: latitude,
                  lng: longitude,
                  accuracy,
                  address: data.address,
                });
              }
            })
            .catch((err) => {
              console.warn("[MapView] reverse geocoding error:", err);
            })
            .finally(() => {
              isFetchingAddressRef.current = false;
            });
        }

        const initialPopupHtml = buildUserLocationPopupHtml({
          address: userAddressRef.current || undefined,
          accuracy,
          latitude,
          longitude,
          isLoadingAddress: isFetchingAddressRef.current,
        });

        // Cập nhật hoặc tạo Marker hiển thị vị trí
        if (!userMarkerRef.current) {
          const el = createUserMarkerElement();
          const popup = new Popup({ offset: 16, closeButton: false }).setHTML(initialPopupHtml);
          userMarkerRef.current = new Marker({ element: el, anchor: "center" })
            .setLngLat([longitude, latitude])
            .setPopup(popup)
            .addTo(map);
        } else {
          userMarkerRef.current.setLngLat([longitude, latitude]);
          const currentPopup = userMarkerRef.current.getPopup();
          if (currentPopup) {
            currentPopup.setHTML(initialPopupHtml);
          }
        }

        // Cập nhật mũi tên hướng la bàn nếu có
        if (userMarkerRef.current) {
          const headingEl = userMarkerRef.current.getElement().querySelector(".user-location-heading") as HTMLElement | null;
          if (headingEl) {
            if (typeof heading === "number" && !isNaN(heading)) {
              headingEl.style.display = "block";
              headingEl.style.transform = `translateX(-50%) rotate(${heading}deg)`;
            } else {
              headingEl.style.display = "none";
            }
          }
        }

        // Tự động chuyển cam đến vị trí người dùng khi mới lấy được hoặc khi đang ở chế độ follow
        if (isFirstFly || isFollowingRef.current) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: Math.max(map.getZoom(), 15),
            duration: 900,
            essential: true,
          });
          isFirstFly = false;
        }
      },
      (err) => {
        console.warn("Geolocation watch error:", err.code, err.message);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setGpsStatus("denied");
          setShowPermissionModal(true);
        } else {
          setGpsStatus("error");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 12000,
      }
    );
  }, []);

  // Khởi tạo Map và tự động yêu cầu cấp quyền vị trí ngay khi vào trang
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl("/maplibre-gl-worker.mjs");
    const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY;

    const map = new MapLibreMap({
      container: containerRef.current,
      center: [HUE_CENTER.lng, HUE_CENTER.lat],
      zoom: 12,
      attributionControl: false,
      style: withApiKey(GOONG_STYLE, apiKey),
      transformRequest: (url) => {
        if (url.startsWith("https://tiles.goong.io")) {
          return { url: withApiKey(url, apiKey) };
        }
        return { url };
      },
    });

    const hideDefaultGoongIcons = () => {
      try {
        const style = map.getStyle();
        if (!style || !style.layers) return;
        style.layers.forEach((layer) => {
          if (layer.type === "symbol") {
            if (layer.id.startsWith("poi-") || layer.id.includes("poi")) {
              map.setLayoutProperty(layer.id, "visibility", "none");
              map.setLayoutProperty(layer.id, "icon-size", 0);
            } else if (
              layer.layout &&
              ("icon-image" in layer.layout || "icon-size" in layer.layout)
            ) {
              map.setLayoutProperty(layer.id, "icon-size", 0);
            }
          }
        });
      } catch {
        // Safe catch
      }
    };

    map.on("load", () => {
      map.resize();
      hideDefaultGoongIcons();
    });

    map.once("styledata", () => {
      hideDefaultGoongIcons();
    });

    // Khi người dùng chủ động kéo hoặc di chuyển map đi chỗ khác, tạm dừng tự động khóa tâm
    map.on("dragstart", () => {
      isFollowingRef.current = false;
      setIsFollowing(false);
    });

    map.on("click", (e: MapMouseEvent) => {
      if (!addModeRef.current) return;
      onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    requestAnimationFrame(() => map.resize());
    mapRef.current = map;

    // Tự động kích hoạt yêu cầu cấp quyền vị trí ngay khi app mở
    startLocationWatch(true);

    // Lắng nghe thay đổi quyền vị trí nếu trình duyệt hỗ trợ Permissions API
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "denied") {
            setGpsStatus("denied");
            setShowPermissionModal(true);
          }
          result.onchange = () => {
            if (result.state === "granted") {
              startLocationWatch(true);
            } else if (result.state === "denied") {
              setGpsStatus("denied");
              setShowPermissionModal(true);
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (addMarkerRef.current) {
        addMarkerRef.current.remove();
        addMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [startLocationWatch]);

  // Hành động Chuyển cam đến vị trí hiện tại (Locate Me)
  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userCoordsRef.current) {
      isFollowingRef.current = true;
      setIsFollowing(true);
      map.flyTo({
        center: [userCoordsRef.current.lng, userCoordsRef.current.lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 800,
        essential: true,
      });
    } else {
      startLocationWatch(true);
    }
  }, [startLocationWatch]);

  // Hành động Bay về trung tâm Cố đô Huế
  const handleCenterHue = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    isFollowingRef.current = false;
    setIsFollowing(false);
    map.flyTo({
      center: [HUE_CENTER.lng, HUE_CENTER.lat],
      zoom: 12,
      duration: 800,
      essential: true,
    });
  }, []);

  // Điều khiển Zoom và Hướng Bắc
  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleResetNorth = useCallback(() => {
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 600 });
  }, []);

  // Chế độ thêm địa điểm: cursor + pointer-events của markers
  useEffect(() => {
    addModeRef.current = isAddMode;
    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = isAddMode ? "crosshair" : "";
    }
    // Khi đang ở chế độ thêm địa điểm, tắt tương tác của marker cũ để click bất kỳ đâu trên bản đồ đều ăn tọa độ
    markersRef.current.forEach((m) => {
      m.getElement().style.pointerEvents = isAddMode ? "none" : "auto";
    });
  }, [isAddMode]);

  // Quản lý Marker cho vị trí thêm mới (addPosition)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isAddMode && addPosition) {
      if (addMarkerRef.current) {
        addMarkerRef.current.setLngLat([addPosition.lng, addPosition.lat]);
      } else {
        const markerEl = createAddLocationMarkerElement();
        const marker = new Marker({
          element: markerEl,
          anchor: "bottom",
          draggable: true,
        })
          .setLngLat([addPosition.lng, addPosition.lat])
          .addTo(map);

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onMapClickRef.current?.({ lat: lngLat.lat, lng: lngLat.lng });
        });

        addMarkerRef.current = marker;
      }

      // Đảm bảo ghim hiển thị thoáng đãng ở vùng bản đồ (không bị che bởi panel bên phải trên desktop)
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        const point = map.project([addPosition.lng, addPosition.lat]);
        if (point.x > window.innerWidth - 460) {
          map.easeTo({
            center: [addPosition.lng, addPosition.lat],
            offset: [-180, 0],
            duration: 500,
          });
        }
      }
    } else {
      if (addMarkerRef.current) {
        addMarkerRef.current.remove();
        addMarkerRef.current = null;
      }
    }
  }, [isAddMode, addPosition]);

  // Vẽ lộ trình (polyline) khi có routePlaces
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const focusBounds = () => {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");

      if (!routePlaces || routePlaces.length === 0) return;

      if (routePlaces.length === 1) {
        map.flyTo({ center: [routePlaces[0].lng, routePlaces[0].lat], zoom: 14, duration: 800 });
        return;
      }

      const coords = routePlaces.map((p) => [p.lng, p.lat] as [number, number]);
      const bounds = coords.reduce(
        (acc, [lng, lat]) => ({
          minLng: Math.min(acc.minLng, lng),
          maxLng: Math.max(acc.maxLng, lng),
          minLat: Math.min(acc.minLat, lat),
          maxLat: Math.max(acc.maxLat, lat),
        }),
        { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity },
      );

      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        {
          padding: 80,
          duration: 900,
          essential: true,
        },
      );
    };

    if (map.isStyleLoaded()) focusBounds();
    else map.once("load", focusBounds);
  }, [routePlaces, focusRouteToken]);

  // Render marker theo danh sách đã lọc (có đánh số thứ tự chặng nếu thuộc lộ trình)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Tạo bản đồ số thứ tự trong lộ trình (1, 2, 3...)
    const routeIndexMap = new Map<string, number>();
    if (routePlaces && routePlaces.length > 0) {
      routePlaces.forEach((p, idx) => {
        if (!routeIndexMap.has(p.id)) {
          routeIndexMap.set(p.id, idx + 1);
        }
      });
    }

    visiblePlaces.forEach((place) => {
      const category = getCategory(place.category);
      const isSelected = selectedId === place.id;
      const routeIndex = routeIndexMap.get(place.id);
      const isRoute = routeIndex !== undefined;
      const isPending = place.status === "pending";

      const wrapEl = document.createElement("div");
      wrapEl.className = "place-marker-wrap";
      wrapEl.style.pointerEvents = isAddMode ? "none" : "auto";
      if (isPending) {
        wrapEl.title = `⏳ ${place.name} (Địa điểm đang chờ Ban Quản Trị duyệt)`;
      }

      const innerEl = document.createElement("div");
      innerEl.className = `place-marker-inner ${isSelected ? "is-selected" : ""} ${isRoute ? "is-route" : ""} ${isPending ? "is-pending" : ""}`;
      
      // Nếu là điểm trong lộ trình hoặc địa điểm chờ duyệt, hiển thị badge trực quan
      if (isRoute) {
        innerEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span>${category.emoji}</span>
            <span class="absolute -top-2.5 -right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-md ring-2 ring-white">
              ${routeIndex}
            </span>
          </div>
        `;
      } else if (isPending) {
        innerEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span>${category.emoji}</span>
            <span class="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] text-white shadow-md ring-2 ring-white" title="Chờ BQT duyệt">
              ⏳
            </span>
          </div>
        `;
      } else {
        innerEl.innerHTML = `<span>${category.emoji}</span>`;
      }

      innerEl.style.backgroundColor = isSelected
        ? category.color
        : isRoute
        ? "#f5f3ff"
        : isPending
        ? "#fffbeb"
        : "#ffffff";
      innerEl.style.borderColor = isSelected
        ? "#ffffff"
        : isRoute
        ? "#6366f1"
        : isPending
        ? "#f59e0b"
        : category.color;

      wrapEl.appendChild(innerEl);

      const marker = new Marker({ element: wrapEl, anchor: "center" })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      wrapEl.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(place);
      });

      markersRef.current.push(marker);
    });
  }, [visiblePlaces, selectedId, onSelect, routePlaces, isAddMode]);


  // Bay tới địa điểm được chọn
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const place = visiblePlaces.find((p) => p.id === selectedId);
    if (!place) return;
    map.flyTo({ center: [place.lng, place.lat], zoom: 14, duration: 900, essential: true });
  }, [selectedId, visiblePlaces]);

  return (
    <div className="relative h-full w-full isolate">
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Thông báo hướng dẫn cấp quyền vị trí nếu người dùng từ chối */}
      {showPermissionModal && (
        <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl bg-amber-600/95 text-white px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium border border-amber-400/40 animate-in fade-in slide-in-from-top-3 duration-300 max-w-[92vw]">
          <span className="text-lg">📍</span>
          <div>
            <div className="font-bold">Ứng dụng chưa được cấp quyền vị trí</div>
            <div className="text-[11px] text-amber-100">
              Nhấp vào biểu tượng 🔒 trên thanh địa chỉ, chọn &quot;Cho phép vị trí&quot; rồi bấm Thử lại.
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowPermissionModal(false);
                startLocationWatch(true);
              }}
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition active:scale-95 shadow-sm"
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={() => setShowPermissionModal(false)}
              className="rounded-xl p-1 text-white/80 hover:text-white hover:bg-amber-700/60 transition"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Pill: Chuyển cam về vị trí hiện tại khi đang lướt đi nơi khác (nằm ở đáy bản đồ, không đè lên search bar) */}
      {userLocation && !isFollowing && (
        <button
          type="button"
          onClick={handleRecenter}
          className={`pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 shadow-2xl backdrop-blur-md text-xs font-bold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 border border-blue-400/40 ring-4 ring-blue-500/25 ${
            hideControls ? "opacity-0 pointer-events-none translate-y-8 scale-95 invisible" : "opacity-100 translate-y-0 scale-100 visible"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span>Chuyển cam về vị trí của bạn</span>
          <span className="text-sm">🎯</span>
        </button>
      )}

      {/* Cụm công cụ điều khiển Bản đồ (Zoom, Reset Hướng Bắc, Chuyển cam vị trí của tôi, Về trung tâm Huế) */}
      <div
        className={`pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 transition-all duration-300 ease-out ${
          hideControls
            ? "opacity-0 pointer-events-none -translate-x-8 scale-95 invisible"
            : "opacity-100 translate-x-0 scale-100 visible"
        }`}
      >
        {/* Nút Phóng to */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-lg font-bold text-ink-800 shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95 border border-white/60"
          title="Phóng to"
          aria-label="Phóng to"
        >
          +
        </button>

        {/* Nút Thu nhỏ */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-lg font-bold text-ink-800 shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95 border border-white/60"
          title="Thu nhỏ"
          aria-label="Thu nhỏ"
        >
          −
        </button>

        {/* Nút Quay về hướng Bắc */}
        <button
          type="button"
          onClick={handleResetNorth}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-base text-ink-800 shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95 border border-white/60"
          title="Quay về hướng Bắc"
          aria-label="Quay về hướng Bắc"
        >
          🧭
        </button>

        <div className="my-0.5 h-px w-full bg-ink-200/50" />

        {/* Nút Tương tác CHUYỂN CAM ĐẾN VỊ TRÍ HIỆN TẠI (Locate Me) */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleRecenter}
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-md transition-all duration-200 active:scale-95 ${
              gpsStatus === "active" && isFollowing
                ? "bg-blue-600 text-white shadow-blue-500/50 ring-2 ring-blue-400 scale-105"
                : gpsStatus === "active" && !isFollowing
                ? "bg-white text-blue-600 border-2 border-blue-500 shadow-lg hover:bg-blue-50 ring-2 ring-blue-200/60"
                : gpsStatus === "requesting"
                ? "bg-white/90 text-blue-500 border border-blue-200"
                : gpsStatus === "denied"
                ? "bg-white/90 text-rose-500 border-2 border-rose-400 hover:bg-rose-50"
                : "bg-white/90 text-ink-700 hover:bg-white hover:text-ink-900 border border-white/60"
            }`}
            title={
              gpsStatus === "active" && isFollowing
                ? "Đang theo dõi vị trí của bạn (Bấm để căn giữa)"
                : gpsStatus === "active" && !isFollowing
                ? "Chuyển cam đến vị trí hiện tại của bạn"
                : gpsStatus === "requesting"
                ? "Đang lấy tọa độ vị trí..."
                : gpsStatus === "denied"
                ? "Chưa cấp quyền vị trí (Bấm để xem hướng dẫn)"
                : "Bật định vị vị trí của tôi"
            }
            aria-label="Chuyển cam đến vị trí hiện tại"
          >
            {gpsStatus === "requesting" ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
              </svg>
            ) : gpsStatus === "denied" ? (
              <div className="relative flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="7" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                  <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={gpsStatus === "active" && isFollowing ? "2.5" : "2"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="7" />
                  <line x1="12" y1="1" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="23" />
                  <line x1="1" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="23" y2="12" />
                  <circle
                    cx="12"
                    cy="12"
                    r={gpsStatus === "active" && isFollowing ? "3.2" : "2.2"}
                    fill={gpsStatus === "active" ? "currentColor" : "none"}
                  />
                </svg>

                {/* Chấm ping thông báo khi có GPS nhưng người dùng đang lướt đi chỗ khác */}
                {gpsStatus === "active" && !isFollowing && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white"></span>
                  </span>
                )}
              </div>
            )}
          </button>

          {/* Tooltip nổi giải thích trạng thái */}
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200 z-30 whitespace-nowrap">
            <div className="rounded-xl bg-ink-900/90 text-white px-3 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-sm flex items-center gap-1.5">
              <span>🎯</span>
              <span>
                {gpsStatus === "active" && isFollowing
                  ? "Đang bám theo vị trí của bạn"
                  : gpsStatus === "active" && !isFollowing
                  ? "Chuyển cam đến vị trí hiện tại"
                  : gpsStatus === "requesting"
                  ? "Đang xác định GPS..."
                  : gpsStatus === "denied"
                  ? "Bấm để xem hướng dẫn cấp quyền"
                  : "Bật định vị vị trí của tôi"}
              </span>
            </div>
          </div>
        </div>

        {/* Nút Về trung tâm Cố đô Huế */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleCenterHue}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-base text-ink-800 shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95 border border-white/60"
            title="Quay về trung tâm Huế"
            aria-label="Quay về trung tâm Huế"
          >
            🏰
          </button>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200 z-30 whitespace-nowrap">
            <div className="rounded-xl bg-ink-900/90 text-white px-3 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-sm flex items-center gap-1.5">
              <span>🏰</span>
              <span>Về trung tâm Cố đô Huế</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
