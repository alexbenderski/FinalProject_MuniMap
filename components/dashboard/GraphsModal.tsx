"use client";
import { useState } from "react";
import Modal from "@/components/dashboard/Modal";
import {
  LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fetchGraphData, GraphTopic } from "@/lib/client/fetchers";
import { Graph } from "@/lib/types";

export default function GraphsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [newGraph, setNewGraph] = useState<Partial<Graph>>({});

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
    <Modal title="Custom Graphs Dashboard" onClose={onClose}>
      <div className="bg-white p-5 rounded-lg w-[1100px] max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-center mb-4">Select more options to add charts:</h2>

        {/* 🔽 בוררי אפשרויות */}
        <div className="flex flex-wrap gap-3 mb-5 justify-center items-center">
          {/* קטגוריה */}
          <select
            className="border rounded-md px-3 py-1"
            onChange={(e) => setNewGraph({ ...newGraph, category: e.target.value as Graph["category"] })}
            defaultValue=""
          >
            <option value="" disabled>בחר קטגוריה</option>
            <option value="garbage">פסולת</option>
            <option value="lighting">תאורה</option>
            <option value="tree">עצים</option>
            <option value="hazard">hazard</option>

          </select>

          {/* טווח זמן */}
          <select
            className="border rounded-md px-3 py-1"
            onChange={(e) => setNewGraph({ ...newGraph, timeRange: e.target.value as Graph["timeRange"] })}
            defaultValue=""
          >
            <option value="" disabled>בחר טווח זמן</option>
            <option value="month">חודש אחרון</option>
            <option value="3month">3 חודשים</option>
            <option value="6month">חצי שנה</option>
            <option value="year">שנה אחרונה</option>
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
            <option value="" disabled>בחר נושא</option>
            <option value="frequency">תדירות לפי קטגוריה</option>
            <option value="avgResolve">ממוצע זמן טיפול</option>
            <option value="unresolved">לא סגורים</option>
            <option value="resolvedVsTotal">סה״כ דיווחים מול סגורים</option>
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
            <option value="" disabled>בחר סוג גרף</option>

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
            ➕ צור גרף
          </button>
        </div>

        {/* תצוגת הגרפים */}
        <div className="grid grid-cols-2 gap-6">
          {graphs.map((g) => {
            const dataKey =
              g.topic === "avgResolve"
                ? "avgDays"
                : g.topic === "resolvedVsTotal"
                ? "resolved"
                : "reports";

            return (
              <div key={g.id} className="bg-gray-50 p-3 rounded-md shadow relative">
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
          סגור
        </button>
      </div>
    </Modal>
  );
}
