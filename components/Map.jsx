"use client";

import { useEffect, useRef } from "react";

const DEFAULT_CENTER = [39.8283, -98.5795];

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isUrl = (value) => /^https?:\/\//i.test(value);
const looksLikeDomain = (value) =>
  /\\./.test(value) && !/\\s/.test(value) && !/^@/.test(value);
const normalizeUrl = (value) => {
  if (isUrl(value)) return value;
  if (looksLikeDomain(value)) return `https://${value}`;
  return value;
};
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPhoneLike = (value) => /[0-9]/.test(value) && /^[+()0-9\\s.-]+$/.test(value);
const detectContactLabel = (value) => {
  const lower = value.toLowerCase();
  if (lower.includes("discord")) return "Discord";
  if (lower.includes("slack")) return "Slack";
  if (lower.includes("twitter") || lower.includes("x.com")) return "Twitter/X";
  if (lower.includes("instagram") || lower.includes("insta")) return "Instagram";
  if (lower.includes("facebook") || lower.includes("fb.com")) return "Facebook";
  if (lower.includes("github")) return "GitHub";
  if (lower.includes("linkedin")) return "LinkedIn";
  if (lower.includes("telegram") || lower.includes("t.me")) return "Telegram";
  if (lower.includes("whatsapp")) return "WhatsApp";
  if (lower.includes("snapchat")) return "Snapchat";
  return null;
};

export default function TeamMap({ teams = [], userLocation, userRadiusMiles = 15 }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new globalThis.Map());
  const userMarkerRef = useRef(null);
  const iconRef = useRef(null);
  const accentRef = useRef("#e10600");
  const leafletRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return undefined;
    }

    let handleResize = null;
    let cancelled = false;

    const initMap = async () => {
      const leafletModule = await import("leaflet");
      if (cancelled || !mapContainerRef.current) {
        return;
      }

      const L = leafletModule.default ?? leafletModule;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
        DEFAULT_CENTER,
        4
      );
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      }).addTo(map);

      const accent =
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
        "#e10600";
      accentRef.current = accent;

      iconRef.current = L.divIcon({
        className: "team-marker",
        html: "<span class=\"team-marker-pin\"></span>",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -26],
      });

      mapRef.current = map;

      handleResize = () => {
        map.invalidateSize({ animate: false });
      };

      window.addEventListener("resize", handleResize);
      window.setTimeout(handleResize, 0);
    };

    initMap();

    return () => {
      cancelled = true;
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const icon = iconRef.current;
    const L = leafletRef.current;
    if (!map || !icon || !L) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    teams.forEach((team) => {
      if (!Number.isFinite(team.lat) || !Number.isFinite(team.lng)) {
        return;
      }
      const marker = L.marker([team.lat, team.lng], { icon }).addTo(map);
      const name = escapeHtml(team.name);
      const number = escapeHtml(team.team_number || "");
      const description = escapeHtml(team.description);
      const address = escapeHtml(team.address);
      const rawContact = String(team.apply_link || "").trim();
      const normalizedContact = normalizeUrl(rawContact);
      const safeContact = escapeHtml(rawContact);
      const accent = accentRef.current || "#e10600";
      const teamLabel = number ? `${name} #${number}` : name;
      let contactMarkup = "";
      if (rawContact) {
        if (isUrl(normalizedContact)) {
          contactMarkup = `<a href="${normalizedContact}" target="_blank" rel="noopener" style="color: ${accent}; font-weight: 600;">Application link</a>`;
        } else if (isEmail(rawContact)) {
          contactMarkup = `<a href="mailto:${rawContact}" style="color: ${accent}; font-weight: 600;">Email team</a>`;
        } else if (isPhoneLike(rawContact)) {
          const digits = rawContact.replace(/[^+0-9]/g, "");
          contactMarkup = `<a href="tel:${digits}" style="color: ${accent}; font-weight: 600;">Call or text</a>`;
        } else {
          const label = detectContactLabel(rawContact) || "Contact";
          contactMarkup = `<span style="display:block; color: ${accent}; font-weight: 600;">${label}: ${safeContact}</span>`;
        }
      }
      marker.bindPopup(
        `
          <div style="font-family: 'Space Grotesk', sans-serif; min-width: 200px;">
            <strong style="display:block; margin-bottom: 4px;">${teamLabel}</strong>
            <span style="display:block; color: #b2b6bf; margin-bottom: 6px;">${description}</span>
            <span style="display:block; font-size: 0.85rem; margin-bottom: 6px;">${address}</span>
            ${contactMarkup}
          </div>
        `
      );
      markersRef.current.set(team.id, marker);
    });
  }, [teams]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !userLocation || !L) {
      return;
    }

    if (!userMarkerRef.current) {
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
        "#e10600";
      userMarkerRef.current = L.circleMarker(userLocation, {
        radius: 7,
        color: accent,
        fillColor: accent,
        fillOpacity: 0.9,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(userLocation);
    }

    const metersPerPixelAtEquator = 156543.03392;
    const metersPerPixel = metersPerPixelAtEquator * Math.cos((userLocation[0] * Math.PI) / 180);
    const targetPixels = Math.max(map.getSize().x, map.getSize().y) * 0.55;
    const radiusMeters = userRadiusMiles * 1609.34;
    const zoomForRadius = Math.log2((metersPerPixel * targetPixels) / radiusMeters);
    const targetZoom = Math.min(15, Math.max(11, Math.round(zoomForRadius)));
    map.whenReady(() => {
      map.setView(userLocation, targetZoom);
    });
  }, [userLocation]);

  return <div className="map-canvas" ref={mapContainerRef} />;
}
