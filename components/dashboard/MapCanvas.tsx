"use client";
import { useEffect, useState,useRef } from "react";
import {
  GoogleMap,//main component that draws the map, working with center,zoom levels and events handle
  Polygon,//draws bounds of some area by the lat/lng 
  Marker,//for the icons
  InfoWindow,//show a window pop up when click on the icons
  useJsApiLoader,//special hook that loads the js file of the google maps and ensures that api loaded before the map drawing
} from "@react-google-maps/api";
import { fetchCitiesFromLocal, fetchReports } from "@/lib/client/fetchers";
import ReportDetailsModal from "@/components/dashboard/ReportDetailsModal";
import { Report, City} from "@/lib/types";
import { useCityBoundary } from "@/lib/client/hooks/useCityBoundary";
import { useFilteredReports } from "@/lib/client/hooks/useFilteredReports";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 32.794, lng: 34.989 };

function getReportCriticality(timestamp: number): "green" | "yellow" | "orange" | "red" {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
  if (diffDays <= 5) return "green";
  if (diffDays <= 14) return "yellow";
  if (diffDays <= 30) return "orange";
  return "red";
}


export default function MapCanvas({
  selectedArea,
  selectedTypes,
  status,
  dateFrom,
  dateTo,
  mediaOnly,
  criticality,
  onReportsUpdate,
}: {
  selectedArea: string | null;
  selectedTypes: string[];
  status: "open" | "pending" | "in progress" | "resolved" | "all";
  dateFrom: string | null;
  dateTo: string | null;
  mediaOnly: boolean;
  criticality?: string; 
  onReportsUpdate?: (reports: Report[]) => void;
})

{
  //useState because this one will changes over time so when we render we want to save the states after the rendering for each.
  const [map, setMap] = useState<google.maps.Map | null>(null); //store map instance. can used to call functions like fitbounds / panTo
  const [reports, setReports] = useState<Report[]>([]);//array of reports from the db
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);//report that was selected on the map
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [cityBoundary, setCityBoundary] = useState<
  //   { lat: number; lng: number }[] | null
  // >(null); //stores array of objects , each object is like a dot. lat,lng
  const { cityBoundary } = useCityBoundary(selectedArea, map);

  const { isLoaded } = useJsApiLoader({ //loading my google maps api key so tha map could work.
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  // 🔹 טוענים דיווחים פעם אחת בלבד בתחילת העבודה
  useEffect(() => {
    if (!selectedArea) {
      setReports([]); // מנקה דיווחים קיימים כשאין אזור
    return;
    }
    async function loadReports() {
      const data = await fetchReports();
      //data look alike
      //{
      // "garbage": { "id1": {...}, "id2": {...} },
      // "light": { "id3": {...} }
      // }
      const all: Report[] = []; //defines all array of type Report (empty)  .
      Object.entries(data).forEach(([type, group]) => { //turn object to list of pairs [key,value]
        //data will be like : "garbage" - key .  value -  {     rpt_1: {...}, rpt_2: {...}     } 
        // [
        // ["garbage", { rpt_1: {...}, rpt_2: {...} }],
        // ["lighting", { rpt_3: {...}, rpt_7: {...} }],
        // ]
        //the forEach(([type, group]) => {...})
        //  equvivalent to:
        //  forEach((entry) => {
        //   const type = entry[0];
        //   const group = entry[1];
        // })

        //group is like:
        // {
        //   rpt_1: { area: ..., lat: ..., lng: ... },
        //   rpt_2: { area: ..., lat: ..., lng: ... }
        // }
        Object.entries(group as Record<string, Omit<Report, "type" | "id">>).forEach(
        ([id, r]) => {          //group as Record<string, Report> says to ts the desired types, that group is an object that keys are string and values are Report type
          //Object.values(group) extracts the values without the keys 
          // [
            //   { area: ..., lat: ..., lng: ... },
            //   { area: ..., lat: ..., lng: ... }
            // ]
          all.push({ ...r, type,id }); //r is single report, "...r,type" is like adding to r new field "type"
          //if r = { area: "חיפה", lat: 32.8, lng: 34.9 }
          //so after push =  { area: "חיפה", lat: 32.8, lng: 34.9, type: "garbage" }

        });
      });
      // all look like :
      // [
      //  { area: "...", type: "garbage" },
      //  { area: "...", type: "garbage" },
      // ]
      
      setReports(all.filter((r) => r.area === selectedArea)); 

    }
    loadReports();

  }, [selectedArea]); //the [] here means this useEffect will run only once when the component is loading.


  // 🔹 סינון הדיווחים — רק אם יש אזור וגם סוג נבחר


const { filteredReports } = useFilteredReports(reports, {
  selectedArea,
  selectedTypes,
  status,
  dateFrom,
  dateTo,
  mediaOnly,
  criticality,
});

const prevReportsRef = useRef<Report[]>([]);

useEffect(() => {
  // ממירים למחרוזת כדי לבדוק אם השתנה משהו באמת
  const prev = JSON.stringify(prevReportsRef.current);
  const next = JSON.stringify(filteredReports);

  if (prev !== next && onReportsUpdate) {
    onReportsUpdate(filteredReports);
    prevReportsRef.current = filteredReports;
  }
}, [filteredReports, onReportsUpdate]);


  return (
    <div className="flex-1 relative">
      {!isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Loading map…
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={8}
          onLoad={(m) => setMap(m)}
        >
          {/* מציג רק גבול עיר (אם נבחר אזור) */}
          {cityBoundary && (
            <Polygon
              paths={cityBoundary}
              options={{
                strokeColor: "green",
                strokeOpacity: 0.9,
                strokeWeight: 2,
                fillOpacity: 0.1,
                fillColor: "green",
              }}
            />
          )}

          {/* מציג אייקונים רק אם גם אזור וגם סוג נבחרו */}
          {filteredReports.map((r) => (
            <Marker
              // key={r.timestamp}
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              title={r.address ? r.address : (r.area || "לא נמצאה כתובת")}
              onClick={() => {
                setSelectedReport(r); 
                setIsModalOpen(true);// sign that the window is open now 
              }}
          icon={{
            url:
              r.type === "garbage"
                ? `/icons/${getReportCriticality(r.timestamp)}_garbage.png`
                : r.type === "lighting"
                ? `/icons/${getReportCriticality(r.timestamp)}_lighting.png`
                : r.type === "tree"
                ? "/icons/tree.png"
                : "",
            scaledSize: new google.maps.Size(16, 16),
          }}
            />
          ))}

          {/* חלונית מידע */}
          {selectedReport && (
          <ReportDetailsModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            report={selectedReport}
          />
          )}
        </GoogleMap>
      )}
    </div>
  );
}
