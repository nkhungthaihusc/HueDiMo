"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Route, Sparkles, Globe } from "lucide-react";
import MobilePanel from "@/components/home/MobilePanel";
import { CATEGORIES } from "@/lib/data/categories";
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
import CommunityItinerariesModal from "@/components/home/CommunityItinerariesModal";
import HomeLoading from "./HomeLoading";
import { getMyContributedPlaces, getPublicPlaces } from "@/lib/api/places";
import { itineraryPlaceIds, saveItinerary, updateItineraryId } from "@/lib/itinerary/logic";
import { ItineraryAPI } from "@/lib/api/itineraries";
import { toast } from "@/components/ui/Toast";
import type { SavedItinerary } from "@/lib/itinerary/logic";
import type { Itinerary } from "@/lib/itinerary/types";
import type { CategoryId, Place } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthPromptModal from "@/components/auth/AuthPromptModal";

const EMPTY_PLACES: Place[] = [];

export default function HomeClient() {
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placeListPage, setPlaceListPage] = useState<number>(1);
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
  const [communityModalOpen, setCommunityModalOpen] = useState(false);

  const { user, isInitializing } = useAuth();
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

  // Tự động dọn sạch lộ trình đang hiển thị trên bản đồ khi người dùng đăng xuất hoặc chuyển đổi tài khoản
  useEffect(() => {
    setItinerary(null);
    setSelectedId(null);
    setProfileModalOpen(false);
    setSavedListOpen(false);
    setBuilderOpen(false);
    setShowItineraryForm(false);
  }, [user?.id]);

  const [contributions, setContributions] = useState<{ userId: string; places: Place[] } | null>(null);
  const [serverPlaces, setServerPlaces] = useState<Place[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    const controller = new AbortController();
    getPublicPlaces(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setServerPlaces(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });
    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => {
    if (isInitializing || !userId) return;
    let active = true;
    getMyContributedPlaces()
      .then((places) => {
        if (active) setContributions({ userId, places });
      })
      .catch(() => {
        if (active) setContributions({ userId, places: [] });
      });
    return () => { active = false; };
  }, [isInitializing, userId]);

  const contributionsLoading = Boolean(userId && contributions?.userId !== userId);
  const userContributedPlaces = userId && contributions?.userId === userId ? contributions.places : EMPTY_PLACES;
  const publicPlaces = serverPlaces ?? EMPTY_PLACES;

  const accessiblePlaces = useMemo(() => {
    const byId = new Map(publicPlaces.map((place) => [place.id, place]));
    for (const place of userContributedPlaces) {
      if (place.status === "pending" && !byId.has(place.id)) byId.set(place.id, place);
    }
    return [...byId.values()];
  }, [publicPlaces, userContributedPlaces]);

  const visiblePlaces = useMemo(
    () => activeCategory ? accessiblePlaces.filter((place) => place.category === activeCategory) : accessiblePlaces,
    [accessiblePlaces, activeCategory],
  );

  const selectedPlace = useMemo(
    () => accessiblePlaces.find((p) => p.id === selectedId)
      ?? userContributedPlaces.find((p) => p.id === selectedId) ?? null,
    [accessiblePlaces, userContributedPlaces, selectedId],
  );

  const routePlaces = useMemo(() => {
    if (!itinerary) return undefined;
    const ids = itineraryPlaceIds(itinerary);
    return ids
      .map((id) => publicPlaces.find((p) => p.id === id))
      .filter((p): p is Place => p !== undefined);
  }, [itinerary, publicPlaces]);

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
    setPanelExpanded(true);
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
    setPanelExpanded(false);
    if (addMode) {
      setAddMode(false);
      setAddPosition(null);
    } else {
      closeOverlays();
      setAddMode(true);
    }
  };

  const handleOpenItinerary = () => {
    setPanelExpanded(true);
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
    setPanelExpanded(true);
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
    setPanelExpanded(true);
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
    setPanelExpanded(true);
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
    setPanelExpanded(true);
    setItinerary(saved);
    setSavedListOpen(false);
    setBudgetOpen(false);
    setBuilderOpen(false);
    setFocusRouteToken((t) => t + 1);
  };

  const handleMapClick = (coord: { lat: number; lng: number }) => {
    setPanelExpanded(true);
    setAddPosition(coord);
  };

  const handleSubmitPlace = (place: Place) => {
    setAddMode(false);
    setAddPosition(null);
    // Chuyển sang xem chi tiết địa điểm vừa tạo, khi xem xong bấm Quay lại sẽ trở về giao diện bình thường
    setSelectedId(place.id);
    if (userId) {
      setContributions((current) => ({
        userId,
        places: [place, ...(current?.userId === userId ? current.places.filter((item) => item.id !== place.id) : [])],
      }));
    }
  };

  const persistItinerary = async (draft: Itinerary) => {
    const local = saveItinerary(draft, draft.title);
    if (!user) return local;

    let server: Itinerary;
    try {
      server = await ItineraryAPI.saveToServer(local);
    } catch {
      toast.error("Chưa lưu được lên máy chủ. Lộ trình đã được lưu trên trình duyệt.");
      return local;
    }

    const saved = {
      ...local,
      id: server.id ?? local.id,
      isPublic: server.isPublic,
      createdAt: server.createdAt ?? local.createdAt,
      updatedAt: server.updatedAt ?? local.updatedAt,
    };
    updateItineraryId(local.id, saved);
    toast.success("Đã lưu lịch trình.");
    return saved;
  };

  const handleGenerated = async (result: Itinerary) => {
    const saved = await persistItinerary({ ...result, isPublic: false });
    setPanelExpanded(true);
    setItinerary(saved);
    setShowItineraryForm(false);
  };

  const handleBuilderSaved = async (draft: Itinerary) => {
    const saved = await persistItinerary(draft);
    setPanelExpanded(true);
    setItinerary(saved);
    setBuilderOpen(false);
    setEditingItinerary(null);
  };

  const handleShowOnMap = () => {
    setPanelExpanded(false);
    setFocusRouteToken((token) => token + 1);
  };

  const hasCustomOverlay =
    (addMode && addPosition !== null) ||
    savedListOpen ||
    budgetOpen ||
    builderOpen ||
    showItineraryForm ||
    itinerary !== null;

  const overlayPanelContent = (addMode && addPosition !== null) ? (
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
      onExploreCommunity={() => setCommunityModalOpen(true)}
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
      places={publicPlaces}
      onSaved={handleBuilderSaved}
      onCancel={() => {
        setBuilderOpen(false);
        setEditingItinerary(null);
      }}
    />
  ) : showItineraryForm ? (
    <ItineraryFormPanel
      userLocation={userLocation}
      places={publicPlaces}
      onCancel={() => setShowItineraryForm(false)}
      onGenerated={handleGenerated}
      onViewHistory={() => {
        setShowItineraryForm(false);
        setSavedListOpen(true);
      }}
    />
  ) : itinerary !== null ? (
    <ItineraryResultPanel
      itinerary={itinerary}
      places={publicPlaces}
      onBack={() => setItinerary(null)}
      onShowOnMap={handleShowOnMap}
      onSelectPlace={(id) => setSelectedId(id)}
      onEdit={() => handleStartBuilder(itinerary)}
      onExploreCommunity={() => setCommunityModalOpen(true)}
      onOpenHistory={() => {
        setItinerary(null);
        handleOpenSaved();
      }}
    />
  ) : null;

  if (isInitializing || serverPlaces === null) {
    return <HomeLoading retry={loadError ? () => {
      setLoadError(false);
      setLoadAttempt((attempt) => attempt + 1);
    } : undefined} />;
  }

  return (
    <main className="home-shell relative w-full overflow-hidden" data-panel-expanded={panelExpanded} data-add-mode={addMode}>
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
      <div className="home-header pointer-events-none absolute inset-x-0 top-0 z-30">
        <div className="flex min-w-0 flex-col gap-2 md:gap-3">
          <TopBar
            isAddMode={addMode}
            onAddPlace={handleAddPlace}
            onOpenItinerary={handleOpenItinerary}
            onOpenSaved={handleOpenSaved}
            onOpenCommunity={() => setCommunityModalOpen(true)}
            onBudget={handleOpenBudget}
            onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
            onOpenProfile={() => setProfileModalOpen(true)}
            onLogout={() => {
              setItinerary(null);
              closeOverlays();
            }}
          />
          <div
            className={`home-toolbar flex flex-col gap-2 transition-ui duration-300 ease-out pointer-events-none ${
              weatherModalOpen
                ? "-translate-y-4 opacity-0 scale-95 invisible"
                : "translate-y-0 opacity-100 scale-100 visible"
            }`}
          >
            <div className="home-search w-full pointer-events-auto">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSelectPlace={(place) => handleSelect(place)}
              />
            </div>

            <nav aria-label="Lọc loại địa điểm" className="home-categories pointer-events-auto flex w-full gap-2 overflow-x-auto no-scrollbar md:hidden">
              <button type="button" aria-pressed={activeCategory === null} onClick={() => { setActiveCategory(null); setSelectedId(null); }} className={`category-chip ${activeCategory === null ? "is-active" : ""}`}>Tất cả</button>
              {CATEGORIES.map((category) => <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => handleToggleCategory(category.id as CategoryId)} className={`category-chip ${activeCategory === category.id ? "is-active" : ""}`}><span aria-hidden="true">{category.emoji}</span>{category.label}</button>)}
            </nav>

            {addMode && addPosition === null && (
              <span className="home-search w-full glass-strong pointer-events-auto rounded-full px-4 py-1.5 text-xs font-medium text-ink-700 animate-pulse">
                👆 Hãy bấm vào bản đồ để đặt vị trí địa điểm mới
              </span>
            )}
            {addMode && addPosition !== null && (
              <span className="home-search w-full glass-strong pointer-events-auto rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200/70 shadow-sm flex items-center gap-1.5 bg-white/90 backdrop-blur-md">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 motion-beacon"></span>
                🎯 Bấm điểm khác trên bản đồ hoặc kéo thả ghim để đổi vị trí
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Overlay: panel bên phải */}
      <div
        className={`home-panel-position z-20 flex justify-end pointer-events-none transition-ui duration-300 ease-out ${
          weatherModalOpen
            ? "translate-x-10 opacity-0 invisible"
            : "translate-x-0 opacity-100 visible"
        }`}
      >
        <MobilePanel expanded={panelExpanded} onExpandedChange={setPanelExpanded} title={selectedPlace && !hasCustomOverlay ? selectedPlace.name : hasCustomOverlay ? "Hành trình của bạn" : `Khám phá Huế · ${visiblePlaces.length} địa điểm`}>
          {hasCustomOverlay ? (
            overlayPanelContent
          ) : (
            <>
              {selectedPlace !== null && (
                <PlaceDetailPanel
                  key={selectedPlace.id}
                  place={selectedPlace}
                  onBack={() => setSelectedId(null)}
                  userLocation={userLocation}
                />
              )}
              <div className={`h-full w-full ${selectedPlace !== null ? "hidden" : "flex flex-col"}`}>
                <PlaceListPanel
                  places={accessiblePlaces}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  userContributedPlaces={userContributedPlaces}
                  currentPage={placeListPage}
                  onPageChange={setPlaceListPage}
                />
              </div>
            </>
          )}
        </MobilePanel>
      </div>

      {/* Overlay: widget góc trái trên, ngang hàng dưới search */}
      <div className="home-weather absolute z-10">
        <WeatherWidget
          isOpen={weatherModalOpen}
          onModalOpenChange={setWeatherModalOpen}
        />
      </div>

      {/* Overlay: radial menu góc trái dưới */}
      <div
        className={`absolute bottom-6 left-6 z-10 hidden md:block transition-ui duration-300 ease-out ${
          weatherModalOpen
            ? "pointer-events-none -translate-x-10 translate-y-10 scale-90 opacity-0 invisible"
            : "pointer-events-none translate-x-0 translate-y-0 scale-100 opacity-100 visible"
        }`}
      >
        <RadialMenu activeCategory={activeCategory} onToggle={handleToggleCategory} />
      </div>

      <nav aria-label="Điều hướng trên điện thoại" className="mobile-navigation md:hidden">
        <button type="button" aria-pressed={!hasCustomOverlay && !selectedPlace && panelExpanded} onClick={() => { closeOverlays(); setItinerary(null); setSelectedId(null); setPanelExpanded((expanded) => !expanded); }}><Compass size={21} /><span>Khám phá</span></button>
        <button type="button" aria-pressed={savedListOpen} onClick={handleOpenSaved}><Route size={21} /><span>Lịch trình</span></button>
        <button type="button" aria-pressed={showItineraryForm} onClick={handleOpenItinerary}><Sparkles size={21} /><span>Tạo với AI</span></button>
        <button type="button" aria-pressed={communityModalOpen} onClick={() => setCommunityModalOpen(true)}><Globe size={21} /><span>Cộng đồng</span></button>
      </nav>

      {/* Modals: Hồ sơ cá nhân & Bảng xếp hạng Du khách */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
        userContributedPlaces={userContributedPlaces}
        contributionsLoading={contributionsLoading}
        onSelectPlace={handleSelect}
      />

      <LeaderboardModal
        isOpen={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Modal Lộ trình Cộng đồng */}
      <CommunityItinerariesModal
        isOpen={communityModalOpen}
        places={publicPlaces}
        onClose={() => setCommunityModalOpen(false)}
        onUseItinerary={(selectedCommunityItinerary) => {
          setPanelExpanded(true);
          setItinerary(selectedCommunityItinerary);
          setFocusRouteToken((t) => t + 1);
        }}
        onSelectPlace={(id) => {
          const place = publicPlaces.find((p) => p.id === id);
          if (place) handleSelect(place);
        }}
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
