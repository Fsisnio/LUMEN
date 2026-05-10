"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/lib/types";
import { programs } from "@/lib/mock-data";

interface SenegalMapProps {
  projects: Project[];
}

// Senegal center: 14.5°N, -14.5°W
const SENEGAL_CENTER: [number, number] = [14.5, -14.5];
const DEFAULT_ZOOM = 6;

export function SenegalMap({ projects }: SenegalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    const initMap = async () => {
      const el = mapRef.current;
      if (!el) return;
      const L = (await import("leaflet")).default;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(el).setView(SENEGAL_CENTER, DEFAULT_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const projectsWithCoords = projects.filter((p) => p.lat != null && p.lng != null);

      projectsWithCoords.forEach((project) => {
        const program = programs.find((pr) => pr.id === project.programId);
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

        marker.bindPopup(`
          <div class="min-w-[200px]">
            <p class="font-semibold text-[var(--navy)]">${project.title}</p>
            <p class="text-xs text-gray-500 mt-0.5">${project.code} · ${program?.name ?? ""}</p>
            <p class="text-sm mt-2">${project.location}, ${project.region}</p>
            <p class="text-sm">${project.beneficiaries.toLocaleString("en-US")} beneficiaries</p>
            <a href="/projects/${project.id}" class="inline-block mt-2 text-sm font-medium text-[#c9a227] hover:underline">View project →</a>
          </div>
        `);
      });

      mapInstanceRef.current = map;
    };

    initMap();
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [projects]);

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-gray-600">Collaborative Sénégal · {projects.length} project locations</p>
      </div>
    </div>
  );
}
