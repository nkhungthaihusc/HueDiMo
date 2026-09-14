"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import AddPlacePanel from "@/components/home/AddPlacePanel";
import BudgetPanel from "@/components/home/BudgetPanel";
import ItineraryBuilderPanel from "@/components/home/ItineraryBuilderPanel";
import ItineraryFormPanel from "@/components/home/ItineraryFormPanel";
import ItineraryResultPanel from "@/components/home/ItineraryResultPanel";
import MapView from "@/components/home/MapView";
import PlaceDetailPanel from "@/components/home/PlaceDetailPanel";
import PlaceListPanel from "@/components/home/PlaceListPanel";
import RadialMenu from "@/components/home/RadialMenu";
import SavedItinerariesPanel from "@/components/home/SavedItinerariesPanel";
import SearchBar from "@/components/home/SearchBar";
import TopBar from "@/components/home/TopBar";
import WeatherWidget from "@/components/home/WeatherWidget";
import ProfileModal from "@/components/home/ProfileModal";
import LeaderboardModal from "@/components/home/LeaderboardModal";
import {
  getPlacesSnapshot,
  getPlacesServerSnapshot,
  subscribePlaces,
  getAllUserContributedPlaces,
  syncUserContributedPlaces,
} from "@/lib/addplace/logic";
import { getMyContributedPlaces } from "@/lib/api/places";
import { itineraryPlaceIds, saveItinerary } from "@/lib/itinerary/logic";
import type { SavedItinerary } from "@/lib/itinerary/logic";
import type { Itinerary } from "@/lib/itinerary/types";
import type { CategoryId, Place } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthPromptModal from "@/components/auth/AuthPromptModal";

export default function HomeClient() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; address?: string } | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [addPosition, setAddPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [focusRouteToken, setFocusRouteToken] = useState(0);
  const [savedListOpen, setSavedListOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);

  const { user } = useAuth();
  const [authPrompt, setAuthPrompt] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    icon?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const promptLogin = (title: string, description: string, icon = "🔐") => {
    setAuthPrompt({
      isOpen: true,
      title,
      description,
      icon,
    });
  };

  const places = useSyncExternalStore(
    subscribePlaces,
    getPlacesSnapshot,
    getPlacesServerSnapshot,
  );

  // Đồng bộ địa điểm do user đóng góp từ máy chủ khi user đăng nhập
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getMyContributedPlaces()
      .then((userPlaces) => {
        if (isMounted && userPlaces.length > 0) {
          syncUserContributedPlaces(userPlaces);
        }
      })
      .catch((err) => {
        console.error("Lỗi đồng bộ địa điểm đã đóng góp:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Lấy danh sách địa điểm do chính user đã thêm (local + server sync)
  const userContributedPlaces = useMemo(() => {
    const stored = getAllUserContributedPlaces();
    if (!user) return stored;
    return stored.filter(
      (p) =>
        !p.created_by ||
        p.created_by === user.id ||
        p.userId === user.id
    );
  }, [places, user]);

  const userContributedIds = useMemo(
    () => new Set(userContributedPlaces.map((p) => p.id)),
    [userContributedPlaces]
  );

  const visiblePlaces = useMemo(() => {
    return places.filter((p) => {
      const isApproved = !p.status || p.status === "approved";
      const isUserContributed =
        userContributedIds.has(p.id) ||
        Boolean(user && (p.created_by === user.id || p.userId === user.id));

      // Địa điểm được hiển thị nếu đã duyệt HOẶC là địa điểm do chính user này gửi (ghim tạm lên map của user đó)
      if (!isApproved && !isUserContributed) return false;

      return activeCategory ? p.category === activeCategory : true;
    });
  }, [activeCategory, places, user, userContributedIds]);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedId) ?? null,
    [places, selectedId],
  );

  const routePlaces = useMemo(() => {
    if (!itinerary) return undefined;
    const ids = itineraryPlaceIds(itinerary);
    return ids
      .map((id) => places.find((p) => p.id === id))
      .filter((p): p is Place => p !== undefined);
  }, [itinerary, places]);

  const closeOverlays = () => {
    setAddMode(false);
    setAddPosition(null);
    setShowItineraryForm(false);
    setSavedListOpen(false);
    setBuilderOpen(false);
    setEditingItinerary(null);
    setBudgetOpen(false);
    setWeatherModalOpen(false);
  };

  const handleSelect = (place: Place) => {
    setSelectedId(place.id);
    closeOverlays();
  };

  const handleToggleCategory = (id: CategoryId) => {
    setActiveCategory((cur) => (cur === id ? null : id));
    setSelectedId(null);
    closeOverlays();
  };

  const handleAddPlace = () => {
    if (!user) {
      promptLogin(
        "Đăng nhập để đóng góp địa điểm",
        "Bạn cần đăng nhập tài khoản HueDiMo để đề xuất và thêm địa điểm du lịch mới lên bản đồ.",
        "📍"
      );
      return;
    }
    if (addMode) {
      setAddMode(false);
      setAddPosition(null);
    } else {
      closeOverlays();
      setAddMode(true);
    }
  };

  const handleOpenItinerary = () => {
    if (!user) {
      promptLogin(
        "Đăng nhập để tạo lộ trình AI",
        "Tính năng thiết kế lộ trình thông minh bằng AI cần tài khoản để cá nhân hóa theo sở thích và lưu trữ kế hoạch chuyến đi của bạn.",
        "✨"
      );
      return;
    }
    if (showItineraryForm) {
      setShowItineraryForm(false);
    } else {
      closeOverlays();
      setShowItineraryForm(true);
    }
  };

  const handleOpenSaved = () => {
    if (!user) {
      promptLogin(
        "Đăng nhập để xem lộ trình đã lưu",
        "Vui lòng đăng nhập tài khoản để xem lại các kế hoạch du lịch và lịch trình bạn đã lưu.",
        "🧳"
      );
      return;
    }
    if (savedListOpen) {
      setSavedListOpen(false);
    } else {
      closeOverlays();
      setSavedListOpen(true);
    }
  };

  const handleOpenBudget = () => {
    if (!user) {
      promptLogin(
        "Đăng nhập để xem dự toán ngân sách",
        "Tính năng theo dõi và quản lý dự toán ngân sách du lịch yêu cầu bạn đăng nhập tài khoản HueDiMo.",
        "💰"
      );
      return;
    }
    if (budgetOpen) {
      setBudgetOpen(false);
    } else {
      closeOverlays();
      setBudgetOpen(true);
    }
  };

  const handleStartBuilder = (initial: Itinerary | null) => {
    if (!user) {
      promptLogin(
        "Đăng nhập để chỉnh sửa lộ trình",
        "Bạn cần đăng nhập tài khoản để tùy chỉnh các điểm dừng và lưu trữ lộ trình du lịch.",
        "✏️"
      );
      return;
    }
    closeOverlays();
    setEditingItinerary(initial);
    setBuilderOpen(true);
  };

  const handleOpenSavedItinerary = (saved: SavedItinerary) => {
    setItinerary(saved);
    setSavedListOpen(false);
    setBudgetOpen(false);
    setBuilderOpen(false);
    setFocusRouteToken((t) => t + 1);
  };

  const handleMapClick = (coord: { lat: number; lng: number }) => {
    setAddPosition(coord);
  };

  const handleSubmitPlace = (place: Place) => {
    setAddMode(false);
    setAddPosition(null);
    // Chuyển sang xem chi tiết địa điểm vừa tạo, khi xem xong bấm Quay lại sẽ trở về giao diện bình thường
    setSelectedId(place.id);
  };

  const handleGenerated = (result: Itinerary) => {
    // Tự động lưu lịch trình AI vào lịch sử
    const saved = saveItinerary({
      ...result,
      isAiGenerated: true,
      createdAt: result.createdAt || new Date().toISOString(),
    });
    setItinerary(saved);
    setShowItineraryForm(false);
  };

  const handleBuilderSaved = (saved: Itinerary) => {
    setItinerary(saved);
    setBuilderOpen(false);
    setEditingItinerary(null);
  };

  const handleShowOnMap = () => {
    // Focus route handled by MapView
  };

  const panelContent = addMode && addPosition !== null ? (
    <AddPlacePanel
      position={addPosition}
      onSubmit={handleSubmitPlace}
      onCancel={() => {
        setAddMode(false);
        setAddPosition(null);
      }}
    />
  ) : savedListOpen ? (
    <SavedItinerariesPanel
      onClose={() => setSavedListOpen(false)}
      onOpen={handleOpenSavedItinerary}
      onCreate={() => handleStartBuilder(null)}
      onCreateAi={() => {
        setSavedListOpen(false);
        setShowItineraryForm(true);
      }}
    />
  ) : budgetOpen ? (
    <BudgetPanel
      onClose={() => setBudgetOpen(false)}
      onOpen={handleOpenSavedItinerary}
    />
  ) : builderOpen ? (
    <ItineraryBuilderPanel
      initial={editingItinerary}
      places={places}
      onSaved={handleBuilderSaved}
      onCancel={() => {
        setBuilderOpen(false);
        setEditingItinerary(null);
      }}
    />
  ) : showItineraryForm ? (
    <ItineraryFormPanel
      places={places}
      onCancel={() => setShowItineraryForm(false)}
      onGenerated={handleGenerated}
      onViewHistory={() => {
        setShowItineraryForm(false);
        setSavedListOpen(true);
      }}
    />
  ) : selectedPlace !== null ? (
    <PlaceDetailPanel
      key={selectedPlace.id}
      place={selectedPlace}
      onBack={() => setSelectedId(null)}
      userLocation={userLocation}
    />
  ) : itinerary !== null ? (
    <ItineraryResultPanel
      itinerary={itinerary}
      places={places}
      onBack={() => setItinerary(null)}
      onShowOnMap={handleShowOnMap}
      onSelectPlace={(id) => setSelectedId(id)}
      onEdit={() => handleStartBuilder(itinerary)}
      onOpenHistory={() => {
        setItinerary(null);
        handleOpenSaved();
      }}
    />
  ) : (
    <PlaceListPanel
      places={visiblePlaces}
      selectedId={selectedId}
      onSelect={handleSelect}
      userContributedPlaces={userContributedPlaces}
    />
  );

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Bản đồ nền */}
      <div className="absolute inset-0 z-0 isolate">
        <MapView
          selectedId={selectedId}
          visiblePlaces={visiblePlaces}
          onSelect={handleSelect}
          isAddMode={addMode}
          addPosition={addPosition}
          onMapClick={handleMapClick}
          routePlaces={routePlaces}
          focusRouteToken={focusRouteToken}
          onUserLocationChange={setUserLocation}
          hideControls={weatherModalOpen}
        />
      </div>

      {/* Overlay: thanh trên cùng */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
        <div className="flex flex-col gap-3">
          <TopBar
            isAddMode={addMode}
            onAddPlace={handleAddPlace}
            onOpenItinerary={handleOpenItinerary}
            onOpenSaved={handleOpenSaved}
            onBudget={handleOpenBudget}
            onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
            onOpenProfile={() => setProfileModalOpen(true)}
          />
          <div
            className={`flex flex-col items-center gap-2 transition-all duration-300 ease-out pointer-events-none ${
              weatherModalOpen
                ? "-translate-y-4 opacity-0 scale-95 invisible"
                : "translate-y-0 opacity-100 scale-100 visible"
            }`}
          >
            <div className="w-full max-w-xl pointer-events-auto">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSelectPlace={(place) => handleSelect(place)}
              />
            </div>

            {addMode && addPosition === null && (
              <span className="glass-strong pointer-events-auto rounded-full px-4 py-1.5 text-xs font-medium text-ink-700 animate-pulse">
                👆 Hãy bấm vào bản đồ để đặt vị trí địa điểm mới
              </span>
            )}
            {addMode && addPosition !== null && (
              <span className="glass-strong pointer-events-auto rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200/70 shadow-sm flex items-center gap-1.5 bg-white/90 backdrop-blur-md">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                🎯 Bấm điểm khác trên bản đồ hoặc kéo thả ghim để đổi vị trí
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Overlay: panel bên phải */}
      <div
        className={`absolute right-2 sm:right-4 left-2 sm:left-auto top-20 sm:top-24 bottom-3 sm:bottom-4 z-40 flex justify-end pointer-events-none transition-all duration-300 ease-out ${
          weatherModalOpen
            ? "translate-x-10 opacity-0 invisible"
            : "translate-x-0 opacity-100 visible"
        }`}
      >
        <div
          className="pointer-events-auto h-full w-full sm:w-auto flex flex-col justify-start"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {panelContent}
        </div>
      </div>

      {/* Overlay: widget góc trái trên, ngang hàng dưới search */}
      <div className="absolute left-4 top-24 z-10">
        <WeatherWidget
          isOpen={weatherModalOpen}
          onModalOpenChange={setWeatherModalOpen}
        />
      </div>

      {/* Overlay: radial menu góc trái dưới */}
      <div
        className={`absolute bottom-6 left-6 z-10 transition-all duration-300 ease-out ${
          weatherModalOpen
            ? "pointer-events-none -translate-x-10 translate-y-10 scale-90 opacity-0 invisible"
            : "pointer-events-auto translate-x-0 translate-y-0 scale-100 opacity-100 visible"
        }`}
      >
        <RadialMenu activeCategory={activeCategory} onToggle={handleToggleCategory} />
      </div>

      {/* Modals: Hồ sơ cá nhân & Bảng xếp hạng Du khách */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
        userContributedPlaces={userContributedPlaces}
        onSelectPlace={handleSelect}
      />

      <LeaderboardModal
        isOpen={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Modal nhắc nhở đăng nhập */}
      <AuthPromptModal
        isOpen={authPrompt.isOpen}
        onClose={() => setAuthPrompt((prev) => ({ ...prev, isOpen: false }))}
        title={authPrompt.title}
        description={authPrompt.description}
        icon={authPrompt.icon}
      />
    </main>
  );
}
