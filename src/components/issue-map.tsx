"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { LocateFixed, MapPin, RotateCcw } from "lucide-react";
import {
  categories,
  PAFOS_CENTER,
  PAFOS_BOUNDS,
  withinPafos,
  type Issue,
  type IssueLocation,
} from "@/lib/issues";
type Props = {
  issues: Issue[];
  selected?: Issue;
  picking: boolean;
  draft?: IssueLocation;
  onSelect: (id: string) => void;
  onPick: (location: IssueLocation) => void;
};
export default function IssueMap(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    latest = useRef(props);
  const markers = useRef<maplibregl.Marker[]>([]),
    draftMarker = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const selectedId = props.selected?.id,
    selectedLongitude = props.selected?.location.longitude,
    selectedLatitude = props.selected?.location.latitude;
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    if (!host.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: host.current,
        center: PAFOS_CENTER,
        zoom: 13.2,
        minZoom: 10,
        maxZoom: 19,
        maxBounds: [
          [32.25, 34.63],
          [32.6, 34.96],
        ],
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "streets",
              type: "raster",
              source: "osm",
              paint: { "raster-saturation": -0.65 },
            },
          ],
        },
      });
    } catch {
      queueMicrotask(() =>
        setError(
          "The map could not start. Check that WebGL is enabled in your browser. You can still read the community board.",
        ),
      );
      return;
    }
    map.current = instance;
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    instance.on("load", () => {
      setReady(true);
      setError("");
    });
    instance.on("error", () =>
      setError(
        "Some map tiles could not load. Check your connection, then reload the page.",
      ),
    );
    instance.on("click", (e) => {
      if (!latest.current.picking) return;
      if (!withinPafos(e.lngLat.lng, e.lngLat.lat)) {
        setError("Choose a location inside the Pafos reporting area.");
        return;
      }
      setError("");
      latest.current.onPick({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        label: "",
      });
    });
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(host.current);
    return () => {
      resize.disconnect();
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    const grouped = new Map<string, Issue[]>();
    for (const issue of props.issues) {
      const key = `${issue.location.longitude.toFixed(5)},${issue.location.latitude.toFixed(5)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), issue]);
    }
    for (const group of grouped.values())
      group.forEach((issue, index) => {
        const button = document.createElement("button");
        const category = categories[issue.category];
        button.className = `issue-pin${props.selected?.id === issue.id ? " selected" : ""}`;
        button.dataset.category = issue.category;
        button.textContent = category.symbol;
        button.setAttribute(
          "aria-label",
          `${category.label}: ${issue.message}`,
        );
        button.title = `${category.label} · ${issue.location.label}`;
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          latest.current.onSelect(issue.id);
        });
        const angle = (index / group.length) * Math.PI * 2,
          radius = group.length > 1 ? Math.max(24, group.length * 7) : 0;
        const marker = new maplibregl.Marker({
          element: button,
          offset: [Math.cos(angle) * radius, Math.sin(angle) * radius],
        })
          .setLngLat([issue.location.longitude, issue.location.latitude])
          .addTo(map.current!);
        markers.current.push(marker);
      });
  }, [props.issues, props.selected?.id, ready]);
  useEffect(() => {
    if (
      selectedId &&
      selectedLongitude !== undefined &&
      selectedLatitude !== undefined &&
      map.current
    )
      map.current.flyTo({
        center: [selectedLongitude, selectedLatitude],
        zoom: Math.max(map.current.getZoom(), 15),
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 500,
      });
  }, [selectedId, selectedLongitude, selectedLatitude]);
  useEffect(() => {
    draftMarker.current?.remove();
    draftMarker.current = null;
    if (!props.draft || !map.current || !ready) return;
    const node = document.createElement("div");
    node.className = "draft-pin";
    node.textContent = "+";
    draftMarker.current = new maplibregl.Marker({ element: node })
      .setLngLat([props.draft.longitude, props.draft.latitude])
      .addTo(map.current);
  }, [props.draft, ready]);
  const chooseCenter = () => {
    const center = map.current?.getCenter();
    if (!center) return;
    if (!withinPafos(center.lng, center.lat)) {
      setError("Move the map to Pafos before choosing a location.");
      return;
    }
    props.onPick({ longitude: center.lng, latitude: center.lat, label: "" });
    setError("");
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location. Choose a point on the map.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude, latitude } = p.coords;
        if (!withinPafos(longitude, latitude)) {
          setError(
            "You are outside the Pafos reporting area. Choose a point on the map.",
          );
          return;
        }
        setError("");
        map.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
        if (props.picking) props.onPick({ longitude, latitude, label: "" });
      },
      () =>
        setError(
          "Location access was unavailable. You can choose a point on the map.",
        ),
      { timeout: 10000 },
    );
  };
  return (
    <section
      className={`map-panel${props.picking ? " picking" : ""}`}
      aria-label="Public issue map of Pafos"
    >
      <div ref={host} className="map-canvas" />
      <div className="map-heading">
        <MapPin size={18} />
        <div>
          <strong>Pafos, Cyprus</strong>
          <span>
            {props.picking
              ? "Click the map to place your report"
              : "Your neighbourhood, on the map"}
          </span>
        </div>
      </div>
      <div className="map-tools">
        <button
          className="icon-button"
          onClick={locate}
          title="Use my location"
          aria-label="Use my location"
        >
          <LocateFixed size={19} />
        </button>
        <button
          className="icon-button"
          onClick={() => {
            map.current?.fitBounds(
              [
                [PAFOS_BOUNDS.west + 0.035, PAFOS_BOUNDS.south + 0.035],
                [PAFOS_BOUNDS.east - 0.035, PAFOS_BOUNDS.north - 0.035],
              ],
              { padding: 40, duration: 300 },
            );
          }}
          title="Reset Pafos map"
          aria-label="Reset Pafos map"
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {!ready && !error && (
        <div className="map-notice" role="status">
          Loading Pafos streets…
        </div>
      )}
      {error && (
        <div className="map-notice error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss map message">
            ×
          </button>
        </div>
      )}
      {props.picking ? (
        <div className="map-bottom">
          <span>Pan or zoom to the exact spot.</span>
          <button
            className="button small"
            disabled={!ready}
            onClick={chooseCenter}
          >
            Use map centre
          </button>
        </div>
      ) : (
        <div className="map-bottom map-key">
          <span className="live-dot" />
          <span>
            {props.issues.length} public{" "}
            {props.issues.length === 1 ? "report" : "reports"} on this map
          </span>
          <span className="key-note">Select a pin to read</span>
        </div>
      )}
    </section>
  );
}
