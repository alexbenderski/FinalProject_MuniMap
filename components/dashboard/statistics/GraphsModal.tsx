"use client";
import { useState, useRef } from "react";
import Modal from "@/components/dashboard/common/Modal";
import {
  LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fetchGraphData, GraphTopic } from "@/lib/client/fetchers";
import { Graph } from "@/lib/types";
import RealtimeClock from "../common/RealtimeClock";
import jsPDF from "jspdf";
import { useLanguage } from "@/lib/i18n";

export default function GraphsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [newGraph, setNewGraph] = useState<Partial<Graph>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const graphsContainerRef = useRef<HTMLDivElement>(null);

  const downloadGraphsAsPDF = async () => {
    if (graphs.length === 0) {
      alert(t("graphsModal.noGraphsToDownload"));
      return;
    }
    
    setIsDownloading(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      // Add title
      pdf.setFontSize(18);
      pdf.text('Custom Graphs Dashboard', pageWidth / 2, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
      
      let yOffset = 30;
      
      for (let i = 0; i < graphs.length; i++) {
        const graphElement = document.getElementById(`graph-${graphs[i].id}`);
        if (!graphElement) continue;

        try {
          const svg = graphElement.querySelector('svg');
          if (!svg) continue;

          const bbox = svg.getBoundingClientRect();
          const width = Math.max(1, Math.round(bbox.width));
          const height = Math.max(1, Math.round(bbox.height));

          const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
          clonedSvg.setAttribute('width', `${width}`);
          clonedSvg.setAttribute('height', `${height}`);
          clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

          // Remove external styles and any inline styles that may carry unsupported color functions
          clonedSvg.querySelectorAll('style,link').forEach((el) => el.remove());
          clonedSvg.querySelectorAll('[style]').forEach((el) => {
            const styleAttr = el.getAttribute('style') || '';
            if (styleAttr.includes('lab(')) {
              el.removeAttribute('style');
            }
          });

          // Enforce safe fills/strokes so serialization stays RGB/hex
          clonedSvg.querySelectorAll('rect,path,line').forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if (!el.getAttribute('fill')) {
              el.setAttribute('fill', tag === 'rect' ? '#3b82f6' : 'none');
            }
            if (!el.getAttribute('stroke')) {
              el.setAttribute('stroke', '#0f172a');
            }
          });

          clonedSvg.querySelectorAll('text').forEach((el) => {
            if (!el.getAttribute('fill')) el.setAttribute('fill', '#0f172a');
            (el as SVGTextElement).setAttribute('font-family', 'Arial, sans-serif');
            (el as SVGTextElement).setAttribute('font-size', '12px');
          });

          const serialized = new XMLSerializer().serializeToString(clonedSvg);
          const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (e) => reject(e);
            image.src = url;
          });

          const canvas = document.createElement('canvas');
          canvas.width = width * 2; // upscale for clarity
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f9fafb';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          URL.revokeObjectURL(url);

          const imgData = canvas.toDataURL('image/png', 1.0);
          const imgWidth = pageWidth - margin * 2;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (yOffset + imgHeight > pageHeight - margin && i > 0) {
            pdf.addPage();
            yOffset = margin;
          }

          pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
          yOffset += imgHeight + 10;
        } catch (graphError) {
          console.error(`Error processing graph ${i}:`, graphError);
        }
      }
      
      pdf.save(`graphs-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!open) return null;

  //  מגדירים אילו נושאים אפשריים לפי סוג הגרף
const allowedTypesPerTopic: Record<GraphTopic, { type: Graph["type"], label: string }[]> = {
  frequency: [
    { type: "line", label: "גרף קו" },
    { type: "bar", label: "גרף עמודות" },
  ],
  avgResolve: [
    { type: "line", label: "גרף קו" },
  ],
  unresolved: [
    { type: "bar", label: "גרף עמודות" },
  ],
  resolvedVsTotal: [
    { type: "double", label: "עמודות כפולות" },
  ],
};

    const addGraph = async () => {
      if (graphs.length >= 4) {
        alert("ניתן להציג עד 4 גרפים בלבד בו זמנית");
        return;
      }
      if (!newGraph.type || !newGraph.category || !newGraph.timeRange || !newGraph.topic) {
        alert("אנא בחר את כל השדות הנדרשים");
        return;
      }

      // 🔹 בדיקה: האם כבר קיים גרף עם אותם הגדרות?
      const exists = graphs.some((g) =>
        g.category === newGraph.category &&
        // g.timeRange === newGraph.timeRange &&
        g.topic === newGraph.topic
      );

      if (exists) {
        alert("כבר קיים גרף עם אותם נתונים (קטגוריה, טווח זמן ונושא)");
        return;
      }

      const fetchedData = await fetchGraphData(
        newGraph.category as "garbage" | "lighting" | "tree" | "hazard",
        newGraph.timeRange as "month" | "3month" | "6month" | "year",
        newGraph.topic as GraphTopic
      );

      setGraphs([
        ...graphs,
        { ...(newGraph as Graph), id: Date.now(), data: fetchedData },
      ]);
    };

  const removeGraph = (id: number) => {
    setGraphs(graphs.filter((g) => g.id !== id));
  };

  return (
    <Modal title={t("graphsModal.title")} onClose={onClose}>
      <div className="bg-white p-5 rounded-lg w-[1100px] max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-center mb-4">{t("graphsModal.selectOptions")}</h2>
            <RealtimeClock />
        {/* 🔽 בוררי אפשרויות */}
        <div className="flex flex-wrap gap-3 mb-5 justify-center items-center">
          {/* קטגוריה */}
          <select
            className="border rounded-md px-3 py-1"
            onChange={(e) => setNewGraph({ ...newGraph, category: e.target.value as Graph["category"] })}
            defaultValue=""
          >
            <option value="" disabled>{t("graphsModal.selectCategory")}</option>
            <option value="garbage">{t("categories.garbage")}</option>
            <option value="lighting">{t("categories.lighting")}</option>
            <option value="tree">{t("categories.tree")}</option>
            <option value="hazard">{t("categories.hazard")}</option>

          </select>

          {/* טווח זמן */}
          <select
            className="border rounded-md px-3 py-1"
            onChange={(e) => setNewGraph({ ...newGraph, timeRange: e.target.value as Graph["timeRange"] })}
            defaultValue=""
          >
            <option value="" disabled>{t("graphsModal.selectTimeRange")}</option>
            <option value="month">{t("graphsModal.lastMonth")}</option>
            <option value="3month">{t("graphsModal.threeMonths")}</option>
            <option value="6month">{t("graphsModal.sixMonths")}</option>
            <option value="year">{t("graphsModal.lastYear")}</option>
          </select>


          {/* נושא גרף — משתנה לפי סוג */}
          <select
            className="border rounded-md px-3 py-1"
            value={newGraph.topic || ""}
            onChange={(e) => {
              const topic = e.target.value as GraphTopic;
              setNewGraph({
                ...newGraph,
                topic,
                type: undefined, // מאפס כי סוג תלוי בנושא
              });
            }}
          >
            <option value="" disabled>{t("graphsModal.selectTopic")}</option>
            <option value="frequency">{t("graphsModal.frequency")}</option>
            <option value="avgResolve">{t("graphsModal.avgResolve")}</option>
            <option value="unresolved">{t("graphsModal.unresolved")}</option>
            <option value="resolvedVsTotal">{t("graphsModal.resolvedVsTotal")}</option>
          </select>


          {/* סוג גרף */}
          <select
            className="border rounded-md px-3 py-1"
            value={newGraph.type || ""}
            disabled={!newGraph.topic}
            onChange={(e) => {
              setNewGraph({
                ...newGraph,
                type: e.target.value as Graph["type"],
              });
            }}
          >
            <option value="" disabled>{t("graphsModal.selectGraphType")}</option>

            {newGraph.topic &&
              allowedTypesPerTopic[newGraph.topic].map((g) => (
                <option key={g.type} value={g.type}>
                  {g.label}
                </option>
              ))}
          </select>



          <button
            onClick={addGraph}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            {t("graphsModal.createGraph")}
          </button>
          
          {graphs.length > 0 && (
            <button
              onClick={downloadGraphsAsPDF}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              📄 {isDownloading ? t("graphsModal.generatingPDF") : t("graphsModal.downloadPDF")}
            </button>
          )}
        </div>

        {/* תצוגת הגרפים */}
        <div className="grid grid-cols-2 gap-6" ref={graphsContainerRef}>
          {graphs.map((g) => {
            const dataKey =
              g.topic === "avgResolve"
                ? "avgDays"
                : g.topic === "resolvedVsTotal"
                ? "resolved"
                : "reports";

            return (
              <div key={g.id} id={`graph-${g.id}`} className="bg-gray-50 p-3 rounded-md shadow relative">
                <button
                  onClick={() => removeGraph(g.id)}
                  className="absolute right-2 top-2 text-red-600 font-bold"
                >
                  ✖
                </button>
                <h3 className="text-center font-semibold mb-2">
                  {g.category.toUpperCase()} —{" "}
                  {g.topic === "frequency"
                    ? "תדירות לפי קטגוריה"
                    : g.topic === "avgResolve"
                    ? "ממוצע זמן טיפול"
                    : g.topic === "resolvedVsTotal"
                    ? "כלל הדיווחים מול סגורים"
                    : "לא סגורים"}
                </h3>

                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {g.type === "line" && (
                      <LineChart data={g.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey={dataKey}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    )}

                    {g.type === "bar" && (
                      <BarChart data={g.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey={dataKey} fill="#3b82f6" />
                      </BarChart>
                    )}

                    {g.type === "double" && (
                      <BarChart data={g.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="reports" fill="#3b82f6" name="סה״כ דיווחים" />
                        <Bar dataKey="resolved" fill="#10b981" name="דיווחים סגורים" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 block mx-auto"
        >
          {t("graphsModal.close")}
        </button>
      </div>
    </Modal>
  );
}
