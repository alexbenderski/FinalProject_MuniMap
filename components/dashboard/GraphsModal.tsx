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
  const allowedTopics: Record<string, { value: GraphTopic; label: string }[]> = {
    line: [
      { value: "frequency", label: "תדירות לפי קטגוריה" },
      { value: "avgResolve", label: "ממוצע זמן טיפול לפי קטגוריה" },
      { value: "unresolved", label: "לא סגורים" },
    ],
    bar: [
      { value: "frequency", label: "תדירות לפי קטגוריה" },
      { value: "unresolved", label: "לא סגורים" },
    ],
    double: [
      { value: "resolvedVsTotal", label: "כל הדיווחים מול סגורים" },
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

    const fetchedData = await fetchGraphData(
      newGraph.category as "garbage" | "lighting" | "tree",
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

          {/* סוג גרף */}
          <select
            className="border rounded-md px-3 py-1"
            value={newGraph.type || ""}
            onChange={(e) => {
              const type = e.target.value as Graph["type"];
              setNewGraph({ ...newGraph, type, topic: undefined }); // 🧽 מאפס את נושא הגרף הקודם
            }}
          >
            <option value="" disabled>בחר סוג גרף</option>
            <option value="line">קו</option>
            <option value="bar">עמודות</option>
            <option value="double">עמודות כפולות</option>
          </select>

          {/* נושא גרף — משתנה לפי סוג */}
          <select
            className="border rounded-md px-3 py-1"
            value={newGraph.topic || ""}
            onChange={(e) => setNewGraph({ ...newGraph, topic: e.target.value as Graph["topic"] })}
            disabled={!newGraph.type}
          >
            <option value="" disabled>בחר נושא גרף</option>
            {newGraph.type &&
              allowedTopics[newGraph.type].map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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
