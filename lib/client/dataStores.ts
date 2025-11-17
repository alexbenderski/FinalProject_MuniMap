// lib/dataStores.ts

// 🏙️ טיפוס לעיר אחת
export interface City {
  city: string;
  coordinates: { lat: number; lng: number }[];
  district: string;
}

// מחוזות בישראל (כמו בפרויקט הישן)
export const citiesByDistrict: Record<string, City[]> = {
  "Haifa District": [],
  "North District": [],
  "Center District": [],
  "South District": [],
  "Jerusalem District": [],
  "Tel Aviv District": [],
  "Judea and Samaria": [],
};

// כל הערים בקובץ (GeoJSON)
export let geoJasonAllCities: City[] = [];

// מילון שממפה שם עיר → נתוני העיר
export const cityDict: Record<string, City> = {};

// רשימה פשוטה של שמות כל הערים (ל־select)
export const cityAllNames: string[] = [];

// פונקציה לעדכון מבוקר (מונעת אובדן רפרנסים)
export function setGeoData(cities: City[]) {
  geoJasonAllCities = cities;
  cityAllNames.length = 0;
  Object.keys(cityDict).forEach((key) => delete cityDict[key]);
  Object.keys(citiesByDistrict).forEach((key) => (citiesByDistrict[key] = []));

  cities.forEach((city) => {
    const cityName = city.city;
    const cityCoordinates = city.coordinates;
    const cityDistrict = city.district;

    if (citiesByDistrict[cityDistrict]) {
      citiesByDistrict[cityDistrict].push({
        city: cityName, // ✅ שם העיר בלבד, לא האובייקט כולו
        coordinates: cityCoordinates,
        district: cityDistrict,
      });
    }

    cityDict[cityName] = {
      city: cityName,
      coordinates: cityCoordinates,
      district: cityDistrict,
    };

    cityAllNames.push(cityName);
  });
}
