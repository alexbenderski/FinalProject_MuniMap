// src/hooks/useCityBoundary.ts
import { useState, useEffect } from "react";
import { fetchCitiesFromLocal } from "@/lib/fetchers";
import { City } from "@/lib/types";

export function useCityBoundary(selectedArea: string | null, map: google.maps.Map | null) {
  const [cityBoundary, setCityBoundary] = useState<{ lat: number; lng: number }[] | null>(null);

  useEffect(() => {
    if (!selectedArea) {
      setCityBoundary(null);
      return;
    }

    async function loadBoundary() {
      const data: City[] = await fetchCitiesFromLocal();
      const found = data.find((c) => c.city === selectedArea);

      if (!found) {
        setCityBoundary(null);
        return;
      }

      const coords = found.coordinates.map((p) => ({ lat: p.lat, lng: p.lng }));
      setCityBoundary(coords);

      if (map) {
        const bounds = new google.maps.LatLngBounds();
        coords.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds);
      }
    }

    loadBoundary();
  }, [selectedArea, map]);

  return { cityBoundary, setCityBoundary };
}
