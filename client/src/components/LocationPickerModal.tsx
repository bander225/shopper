/**
 * LocationPickerModal - نافذة تحديد الموقع من خريطة قوقل
 * - دبوس ثابت في وسط الشاشة يتبع تحريك الخريطة
 * - Geocoding تلقائي عند توقف التحريك
 * - زر "موقعي الحالي" لتحديد الموقع بـ GPS
 * - حقل بحث عن العنوان بـ AutocompleteService (داخل الـ dialog - يعمل على iOS)
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Locate, Search, Loader2, Check, X } from "lucide-react";
import { usePersistFn } from "@/hooks/usePersistFn";

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapScriptLoaded = false;
let mapScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (mapScriptLoaded) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;
  mapScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      mapScriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      mapScriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapScriptPromise;
}

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: { text: string; lat: number; lng: number }) => void;
  initialLat?: number;
  initialLng?: number;
  /** تصفية نتائج البحث حسب نوع المكان (مثل: restaurant, cafe, supermarket, pharmacy) */
  searchTypes?: string[];
  /** عنوان الـ header */
  title?: string;
}

interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// Default center: Riyadh, Saudi Arabia
const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

export function LocationPickerModal({
  open,
  onOpenChange,
  onConfirm,
  initialLat,
  initialLng,
  searchTypes,
  title,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentLat, setCurrentLat] = useState(initialLat ?? DEFAULT_CENTER.lat);
  const [currentLng, setCurrentLng] = useState(initialLng ?? DEFAULT_CENTER.lng);
  const [mapReady, setMapReady] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Geocode lat/lng → address text
  const geocodePosition = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    setIsGeocoding(true);
    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results: any, status: any) => {
        setIsGeocoding(false);
        if (status === "OK" && results && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }
    );
  }, []);

  const initMap = usePersistFn(async () => {
    if (!open || !mapContainerRef.current) return;
    await loadMapScript();
    if (!mapContainerRef.current) return;

    const center = {
      lat: initialLat ?? DEFAULT_CENTER.lat,
      lng: initialLng ?? DEFAULT_CENTER.lng,
    };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 15,
      center,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      mapId: "DEMO_MAP_ID",
      gestureHandling: "greedy",
    });

    mapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    // PlacesService requires a map or div
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);

    // Listen for map drag → update pin position
    map.addListener("center_changed", () => {
      const c = map.getCenter();
      if (!c) return;
      const lat = c.lat();
      const lng = c.lng();
      setCurrentLat(lat);
      setCurrentLng(lng);

      // Debounce geocoding
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        geocodePosition(lat, lng);
      }, 600);
    });

    setMapReady(true);
    // Initial geocode
    geocodePosition(center.lat, center.lng);
  });

  useEffect(() => {
    if (open) {
      setMapReady(false);
      setAddress("");
      setSearchQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
      // Small delay to let dialog render
      const t = setTimeout(() => initMap(), 200);
      return () => clearTimeout(t);
    }
  }, [open, initMap]);

  // Search suggestions using AutocompleteService
  const fetchSuggestions = useCallback((query: string) => {
    if (!query.trim() || !autocompleteServiceRef.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "sa" },
        language: "ar",
        ...(searchTypes && searchTypes.length > 0 ? { types: searchTypes } : {}),
      },
      (predictions: any, status: any) => {
        setIsSearching(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setSuggestions(
            predictions.map((p: any) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || "",
            }))
          );
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 350);
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    if (!placesServiceRef.current || !mapRef.current) return;
    setShowSuggestions(false);
    setSearchQuery(suggestion.mainText);
    setSuggestions([]);
    setIsGeocoding(true);
    placesServiceRef.current.getDetails(
      { placeId: suggestion.placeId, fields: ["geometry", "formatted_address"] },
      (place: any, status: any) => {
        setIsGeocoding(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          mapRef.current!.setCenter({ lat, lng });
          mapRef.current!.setZoom(17);
          setAddress(place.formatted_address || suggestion.description);
          setCurrentLat(lat);
          setCurrentLng(lng);
        }
      }
    );
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  // Use GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setIsLocating(false);
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(17);
        }
        setCurrentLat(lat);
        setCurrentLng(lng);
        geocodePosition(lat, lng);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    if (!address) return;
    onConfirm({ text: address, lat: currentLat, lng: currentLng });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-lg w-full rounded-2xl customer-theme"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border bg-white rounded-t-2xl">
          <h3 className="text-base font-black text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {title ?? "حدد موقع التوصيل"}
          </h3>
          {/* Search input with custom suggestions */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="ابحث عن مدينة أو عنوان..."
                className="w-full h-11 pr-9 pl-10 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-muted/30"
                dir="rtl"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleClearSearch(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              ) : null}
            </div>

            {/* Suggestions dropdown - داخل الـ dialog */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute top-full right-0 left-0 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden"
                style={{ zIndex: 9999 }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-primary/5 active:bg-primary/10 transition-colors border-b border-border/50 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.mainText}</p>
                      {s.secondaryText && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{s.secondaryText}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map container */}
        <div className="relative" style={{ height: "300px" }}>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Fixed center pin */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="flex flex-col items-center" style={{ marginBottom: "28px" }}>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-2 border-white">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="w-2 h-2 bg-primary/40 rounded-full mt-0.5" />
            </div>
          </div>

          {/* Locate me button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="absolute bottom-3 left-3 z-20 bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-2 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors border border-border"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Locate className="w-4 h-4 text-primary" />
            )}
            موقعي الحالي
          </button>
        </div>

        {/* Address preview + confirm */}
        <div className="px-4 py-3 bg-white border-t border-border rounded-b-2xl">
          <div className="flex items-start gap-3 mb-3 min-h-[44px]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {isGeocoding ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري تحديد العنوان...</span>
                </div>
              ) : address ? (
                <>
                  <p className="text-xs text-muted-foreground">سيتم التوصيل إلى</p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{address}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">حرّك الخريطة لتحديد موقعك</p>
              )}
            </div>
          </div>
          <Button
            className="w-full bg-primary text-white rounded-xl h-11 font-bold flex items-center gap-2"
            onClick={handleConfirm}
            disabled={!address || isGeocoding}
          >
            <Check className="w-4 h-4" />
            تأكيد الموقع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
