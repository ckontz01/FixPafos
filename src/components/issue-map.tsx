"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { Check, LocateFixed, MapPin, RotateCcw } from "lucide-react";
import CategoryIcon from "./category-icon";
import { useI18n } from "./i18n-provider";
import {
  categories,
  categoryIds,
  PAFOS_CENTER,
  PAFOS_BOUNDS,
  withinPafos,
  type Issue,
  type IssueLocation,
} from "@/lib/issues";
import type { MessageKey } from "@/lib/i18n";
type Props = {
  issues: Issue[];
  selected?: Issue;
  picking: boolean;
  draft?: IssueLocation;
  onSelect: (id: string) => void;
  onPick: (location: IssueLocation) => void;
};
export default function IssueMap(props: Props) {
  const { t, tp } = useI18n();
  const markerIcons = useRef<HTMLDivElement>(null);
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
        button.className = `issue-pin${props.selected?.id === issue.id ? " selected" : ""}${issue.status === "resolved" ? " resolved" : ""}`;
        button.dataset.category = issue.category;
        button.textContent =
          issue.status === "resolved" ? "✓" : category.symbol;
        const icon = markerIcons.current?.querySelector(
          `[data-marker-icon="${issue.status === "resolved" ? "resolved" : issue.category}"] svg`,
        );
        if (icon) button.replaceChildren(icon.cloneNode(true));
        if (props.selected?.id === issue.id) {
          const caption = document.createElement("span");
          caption.className = "pin-caption";
          caption.textContent = issue.location.label;
          button.append(caption);
        }
        button.setAttribute(
          "aria-label",
          `${issue.status === "resolved" ? t("map.resolvedPrefix") : ""}${t(
            `category.${issue.category}` as MessageKey,
          )}: ${issue.message}`,
        );
        button.title = `${t(
          `category.${issue.category}` as MessageKey,
        )} · ${issue.location.label}`;
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
    // `t` is a dependency because pin labels and tooltips are translated:
    // switching language must relabel every marker.
  }, [props.issues, props.selected?.id, ready, t]);
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
      setError(t("map.moveToPafos"));
      return;
    }
    props.onPick({ longitude: center.lng, latitude: center.lat, label: "" });
    setError("");
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setError(t("map.noGeolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude, latitude } = p.coords;
        if (!withinPafos(longitude, latitude)) {
          setError(t("map.outsideArea"));
          return;
        }
        setError("");
        map.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
        if (props.picking) props.onPick({ longitude, latitude, label: "" });
      },
      () =>
        setError(t("map.locationUnavailable")),
      { timeout: 10000 },
    );
  };
  return (
    <section
      className={`map-panel${props.picking ? " picking" : ""}`}
      aria-label={t("map.label")}
    >
      <div ref={host} className="map-canvas" />
      <div ref={markerIcons} hidden aria-hidden="true">
        {categoryIds.map((category) => (
          <span key={category} data-marker-icon={category}>
            <CategoryIcon category={category} size={19} />
          </span>
        ))}
        <span data-marker-icon="resolved">
          <Check size={19} />
        </span>
      </div>
      <div className="map-heading">
        <MapPin size={18} />
        <div>
          <strong>{t("nav.location")}</strong>
          <span>
            {props.picking ? t("map.pickPrompt") : t("map.tagline")}
          </span>
        </div>
      </div>
      <div className="map-tools">
        <button
          className="icon-button"
          onClick={locate}
          title={t("map.useMyLocation")}
          aria-label={t("map.useMyLocation")}
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
          title={t("map.reset")}
          aria-label={t("map.reset")}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {!ready && !error && (
        <div className="map-notice" role="status">
          {t("map.loading")}
        </div>
      )}
      {error && (
        <div className="map-notice error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label={t("map.dismiss")}>
            ×
          </button>
        </div>
      )}
      {props.picking ? (
        <div className="map-bottom">
          <span>{t("map.panHint")}</span>
          <button
            className="button small"
            disabled={!ready}
            onClick={chooseCenter}
          >
            {t("map.useCentre")}
          </button>
        </div>
      ) : (
        <div className="map-bottom map-key">
          <span className="live-dot" />
          <span>{tp("map.publicReports", props.issues.length)}</span>
          <span className="key-note">{t("map.selectPin")}</span>
        </div>
      )}
    </section>
  );
}
