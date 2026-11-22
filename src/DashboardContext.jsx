import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "./api.js";

const DashboardContext = createContext(null);

async function fetchAll() {
  const [units, assignments, timetable] = await Promise.all([
    apiFetch("/api/units"),
    apiFetch("/api/assignments"),
    apiFetch("/api/timetable"),
  ]);
  return { units, assignments, timetable };
}

export function DashboardProvider({ children }) {
  const [units, setUnits] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState("");

  
  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((data) => {
        if (cancelled) return;
        setUnits(data.units);
        setAssignments(data.assignments);
        setTimetable(data.timetable);
      })
      .catch((err) => {
        if (!cancelled) setUnitsError(err.message || "Could not load your data.");
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const data = await fetchAll();
    setUnits(data.units);
    setAssignments(data.assignments);
    setTimetable(data.timetable);
  }

 
  async function addUnit({ code, name, lecturer = "", semesterId = null }) {
    const created = await apiFetch("/api/units", {
      method: "POST",
      body: JSON.stringify({ code, name, lecturer, semesterId }),
    });
    await refresh();
    return created;
  }

  async function updateUnit(id, updates) {
    const updated = await apiFetch(`/api/units/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    await refresh();
    return updated;
  }

  async function deleteUnit(id) {
    await apiFetch(`/api/units/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function addAssignment({ title, type, unitId, dueDate }) {
    const created = await apiFetch("/api/assignments", {
      method: "POST",
      body: JSON.stringify({ title, type, unitId, dueDate }),
    });
    await refresh();
    return created;
  }

  async function updateAssignment(id, updates) {
    const updated = await apiFetch(`/api/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    await refresh();
    return updated;
  }

  async function deleteAssignment(id) {
    await apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function toggleAssignmentComplete(id) {
    const target = assignments.find((a) => a.id === id);
    if (!target) return;
    await updateAssignment(id, { completed: !target.completed });
  }

  async function addTimetableEntry({ unitId, dayOfWeek, startTime, endTime, location = "" }) {
    const created = await apiFetch("/api/timetable", {
      method: "POST",
      body: JSON.stringify({ unitId, dayOfWeek, startTime, endTime, location }),
    });
    await refresh();
    return created;
  }

  async function updateTimetableEntry(id, updates) {
    const updated = await apiFetch(`/api/timetable/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    await refresh();
    return updated;
  }

  async function deleteTimetableEntry(id) {
    await apiFetch(`/api/timetable/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <DashboardContext.Provider
      value={{
        units,
        unitsLoading,
        unitsError,
        assignments,
        timetable,
        addUnit,
        updateUnit,
        deleteUnit,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        toggleAssignmentComplete,
        addTimetableEntry,
        updateTimetableEntry,
        deleteTimetableEntry,
        refresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside a DashboardProvider");
  }
  return ctx;
}