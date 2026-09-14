"use client";

import { useState, useEffect, useRef } from "react";
import type { Place } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSelectPlace?: (place: Place) => void;
  debounceMs?: number;
}

export default function SearchBar({
  value,
  onChange,
  onSelectPlace,
  debounceMs = 350,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce input change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // Call API /api/places/search when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    fetch(`${BACKEND_URL}/api/places/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=5`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setResults(json.data || []);
          setIsSearching(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Lỗi khi tìm kiếm địa điểm:", err);
          setIsSearching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (place: Place) => {
    setShowDropdown(false);
    onChange(place.name);
    if (onSelectPlace) {
      onSelectPlace(place);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-xl pointer-events-auto">
      {/* Main Input Box */}
      <div
        className={`glass-strong flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 transition-all shadow-md ${
          focused ? "ring-2 ring-brand-500 bg-white shadow-lg" : "hover:bg-white/95"
        }`}
      >
        {isSearching ? (
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        ) : (
          <svg
            className="h-5 w-5 shrink-0 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}

        <input
          type="text"
          value={value}
          onFocus={() => {
            setFocused(true);
            setShowDropdown(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          placeholder="Tìm kiếm danh lam, lăng tẩm, món ăn ở Huế..."
          className="w-full bg-transparent text-ink-900 outline-none placeholder:text-ink-500 text-sm"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setResults([]);
              setShowDropdown(false);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 hover:bg-brand-200 transition"
            aria-label="Xóa"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggested 5 Places Dropdown */}
      {showDropdown && debouncedQuery.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-white/40 bg-white/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between border-b border-gray-100">
            <span>Gợi ý địa điểm hàng đầu</span>
            <span className="text-[10px] text-brand-600 font-normal">Tối đa 5 kết quả</span>
          </div>

          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-ink-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <span>Đang tìm kiếm...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-500">
              Không tìm thấy địa điểm nào phù hợp với &quot;{debouncedQuery}&quot;.
            </div>
          ) : (
            <div className="mt-1 space-y-1">
              {results.map((place) => (
                <div
                  key={place.id}
                  onClick={() => handleSelect(place)}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition hover:bg-brand-50"
                >
                  {(place.imageUrl || place.image_url || place.images?.[0]) ? (
                    <img
                      src={place.imageUrl || place.image_url || place.images?.[0]}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-base text-brand-700">
                      📍
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-sm text-ink-900 group-hover:text-brand-700 transition-colors">
                        {place.name}
                      </span>
                      {place.rating && (
                        <span className="shrink-0 text-amber-500 text-xs font-bold">
                          ★ {place.rating}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-ink-500">
                      {place.address || place.description || "Thừa Thiên Huế"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-ink-600 capitalize group-hover:bg-brand-100 group-hover:text-brand-700 transition-colors">
                      {place.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
