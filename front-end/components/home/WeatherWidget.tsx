"use client";

import { useEffect, useState } from "react";
import WeatherDetailModal from "@/components/home/WeatherDetailModal";
import type { ExtendedWeatherData } from "@/lib/types/weather";

const HUE = { lat: 16.4637, lng: 107.5907 };

function weatherInfo(code: number, isDay: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Trời quang" };
  if (code <= 2) return { emoji: "🌤️", label: "Ít mây" };
  if (code === 3) return { emoji: "☁️", label: "Nhiều mây" };
  if (code <= 48) return { emoji: "🌫️", label: "Sương mù" };
  if (code <= 57) return { emoji: "🌦️", label: "Mưa phùn" };
  if (code <= 67) return { emoji: "🌧️", label: "Mưa" };
  if (code <= 77) return { emoji: "🌨️", label: "Tuyết" };
  if (code <= 82) return { emoji: "🌧️", label: "Mưa rào" };
  if (code <= 86) return { emoji: "🌨️", label: "Tuyết rơi" };
  return { emoji: "⛈️", label: "Dông" };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

interface WeatherWidgetProps {
  onSelectStationLocation?: (coord: { lat: number; lng: number; name: string }) => void;
  isOpen?: boolean;
  onModalOpenChange?: (isOpen: boolean) => void;
}

export default function WeatherWidget({
  onSelectStationLocation,
  isOpen: controlledIsOpen,
  onModalOpenChange,
}: WeatherWidgetProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<ExtendedWeatherData | null>(null);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(true);
    }
    onModalOpenChange?.(true);
  };

  const handleClose = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(false);
    }
    onModalOpenChange?.(false);
  };

  useEffect(() => {
    const show = () => setNow(new Date());
    const t = setTimeout(show, 0);
    const tick = setInterval(show, 1_000);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${HUE.lat}&longitude=${HUE.lng}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,uv_index` +
          `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=24&timezone=Asia%2FHo_Chi_Minh`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as ExtendedWeatherData;
        if (!cancelled) setWeather(data);
      } catch {
        // Lỗi mạng: giữ khung giờ, ẩn thời tiết
      }
    };
    load();
    const refresh = setInterval(load, 10 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  const cur = weather?.current;
  const hourly = weather?.hourly;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        title="Bấm để xem chi tiết thời tiết & mạng lưới 52 trạm đo mưa Vrain Thừa Thiên Huế"
        className="glass-strong pointer-events-auto flex flex-col gap-2 rounded-2xl px-3.5 py-2.5 transition-all duration-200 hover:shadow-xl hover:border-brand-400/80 hover:scale-[1.02] active:scale-[0.99] cursor-pointer group select-none"
        aria-label="Mở chi tiết thời tiết và lượng mưa Vrain"
      >
        {/* Hàng trên: Đồng hồ, Ngày & Địa điểm */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-wide text-ink-900">
            {now ? now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--"}
          </span>
          <span className="text-[11px] font-medium text-ink-600">
            {now ? now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }) : ""}
          </span>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 transition group-hover:bg-brand-100">
            <span>📍 Huế</span>
            <span className="text-[9px] opacity-70 transition-transform group-hover:translate-x-0.5">↗</span>
          </div>
        </div>

        {/* Khối thời tiết hiện tại */}
        {cur && hourly ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl transition-transform group-hover:scale-110">
                {weatherInfo(cur.weather_code, cur.is_day).emoji}
              </span>
              <span className="text-base font-bold text-ink-900">{Math.round(cur.temperature_2m)}°</span>
              <span className="text-[11px] text-ink-600 truncate">
                {weatherInfo(cur.weather_code, cur.is_day).label} · Cảm giác {Math.round(cur.apparent_temperature)}°
              </span>
            </div>

            {/* Dự báo theo giờ (6 giờ tiếp theo ở trang chủ) */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {hourly.time.slice(0, 6).map((iso, i) => (
                <span key={iso} className="flex flex-col items-center gap-0.5 text-[10px] text-ink-700">
                  <span className="text-[9px] text-ink-500">{formatTime(iso)}</span>
                  <span className="text-xs">{weatherInfo(hourly.weather_code[i], 1).emoji}</span>
                  <span className="font-bold">{Math.round(hourly.temperature_2m[i])}°</span>
                </span>
              ))}
            </div>

            {/* Footer gợi ý mở rộng */}
            <div className="flex items-center justify-between border-t border-ink-100/70 pt-1.5 text-[10px] text-ink-500">
              <span className="flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Mạng lưới mưa Vrain</span>
              </span>
              <span className="font-bold text-brand-700 group-hover:text-brand-900">Chi tiết 52 trạm ↗</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-ink-600 py-1">
            <span>Đang cập nhật thời tiết...</span>
            <span className="text-[10px] text-brand-600 font-semibold">Xem trạm mưa ↗</span>
          </div>
        )}
      </div>

      {/* Modal Popup Chi tiết */}
      <WeatherDetailModal
        isOpen={isModalOpen}
        onClose={handleClose}
        openMeteoData={weather}
        currentTime={now}
        onSelectStationLocation={onSelectStationLocation}
      />
    </>
  );
}