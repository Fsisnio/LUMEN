"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/lib/types";

const WORLD_FALLBACK_CENTER: [number, number] = [15, 0];
const WORLD_FALLBACK_ZOOM = 2;
/** When only one marker exists, zoom to this level (continent / country sized). */
const SINGLE_POINT_ZOOM = 6;

export interface ProjectWorldMapProps {
  projects: Project[];
  /** Program names by id — tenant data only. */
  programs: { id: string; name: string }[];
  footerCaption?: string;
}

export function ProjectWorldMap({ projects, programs, footerCaption }: ProjectWorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    const programNameFor = (programId: string) =>
      programs.find((pr) => pr.id === programId)?.name ?? "";

    const initMap = async () => {
      const el = mapRef.current;
      if (!el) return;
      const L = (await import("leaflet")).default;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(el).setView(WORLD_FALLBACK_CENTER, WORLD_FALLBACK_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const projectsWithCoords = projects.filter((p) => p.lat != null && p.lng != null);

      projectsWithCoords.forEach((project) => {
        const marker = L.marker([project.lat!, project.lng!], {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div style="
              background: #c9a227;
              width: 24px;
              height: 24px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2px solid white;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          }),
        }).addTo(map);

        const prog = programNameFor(project.programId);

        marker.bindPopup(`
          <div class="min-w-[200px]">
            <p class="font-semibold text-[var(--navy)]">${project.title}</p>
            <p class="text-xs text-gray-500 mt-0.5">${project.code}${prog ? ` · ${prog}` : ""}</p>
            <p class="text-sm mt-2">${project.location}${project.region ? ", " + project.region : ""}</p>
            <p class="text-sm">${project.beneficiaries.toLocaleString("en-US")} beneficiaries</p>
            <a href="/projects/${project.id}" class="inline-block mt-2 text-sm font-medium text-[#c9a227] hover:underline">View project →</a>
          </div>
        `);
      });

      const latlngs = projectsWithCoords.map((p): [number, number] => [p.lat!, p.lng!]);
      if (latlngs.length === 1) {
        map.setView(latlngs[0], SINGLE_POINT_ZOOM);
      } else if (latlngs.length >= 2) {
        const bounds = L.latLngBounds(latlngs).pad(0.08);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
      }

      queueMicrotask(() => map.invalidateSize());
      mapInstanceRef.current = map;
    };

    void initMap();
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [projects, programs]);

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-gray-600">{footerCaption ?? ""}</p>
      </div>
    </div>
  );
}
