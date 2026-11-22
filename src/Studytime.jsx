import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Play, Square } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { apiFetch } from "./api.js";
import "./StudyTemp.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const Periods = ["This week", "Last week"];
const PeriodKeys = { "This week": "this-week", "Last week": "last-week" };
const AxisMaxHours = 6;
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const EMPTY_WEEK = [0, 0, 0, 0, 0, 0, 0];

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

async function fetchStats(periodKey) {
  return apiFetch(
    `/api/study-sessions/stats?period=${periodKey}&tz=${encodeURIComponent(TIMEZONE)}`
  );
}

function StudyTime({ onViewDetails }) {
  const { units } = useDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState(Periods[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [periodData, setPeriodData] = useState({
    "This week": EMPTY_WEEK,
    "Last week": EMPTY_WEEK,
  });
  const [active, setActive] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [selectedUnit, setSelectedUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  const isRunning = active !== null;

  
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchStats("this-week"),
      fetchStats("last-week"),
      apiFetch("/api/study-sessions/active"),
    ])
      .then(([thisWeek, lastWeek, session]) => {
        if (cancelled) return;
        setPeriodData({
          "This week": thisWeek.dailyMinutes,
          "Last week": lastWeek.dailyMinutes,
        });
        if (session) {
          setNow(Date.now());
          setActive({ ...session, baseTime: Date.now() });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load study time.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  async function reloadStats() {
    const [thisWeek, lastWeek] = await Promise.all([
      fetchStats("this-week"),
      fetchStats("last-week"),
    ]);
    setPeriodData({
      "This week": thisWeek.dailyMinutes,
      "Last week": lastWeek.dailyMinutes,
    });
  }

  async function handleStart() {
    setBusy(true);
    setError("");
    try {
      const session = await apiFetch("/api/study-sessions/start", {
        method: "POST",
        body: JSON.stringify({ unitId: selectedUnit ? Number(selectedUnit) : null }),
      });
      setNow(Date.now());
      setActive({ ...session, baseTime: Date.now() });
    } catch (err) {
      setError(err.message || "Could not start the timer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/study-sessions/stop", { method: "POST" });
      setActive(null);
      await reloadStats();
    } catch (err) {
      setError(err.message || "Could not stop the timer.");
    } finally {
      setBusy(false);
    }
  }

  const elapsedSeconds = isRunning
    ? Math.max(0, active.durationSeconds + Math.floor((now - active.baseTime) / 1000))
    : 0;

  const dailyMinutes = periodData[selectedPeriod] || EMPTY_WEEK;

  const totalMinutes = useMemo(
    () => dailyMinutes.reduce((sum, m) => sum + m, 0),
    [dailyMinutes]
  );

  return (
    <div className="study-time-card">
      <div className="study-time-header">
        <h3>Study Time</h3>
        <div className="period-wrapper" ref={dropdownRef}>
          <button className="period-selector" onClick={() => setIsOpen(!isOpen)}>
            <span>{selectedPeriod}</span>
            <ChevronDown size={14} className={`period-chevron${isOpen ? " open" : ""}`} />
          </button>
          {isOpen && (
            <ul className="period-menu">
              {Periods.map((period) => (
                <li key={period}>
                  <button
                    className="period-option"
                    onClick={() => {
                      setSelectedPeriod(period);
                      setIsOpen(false);
                    }}
                  >
                    {period}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="study-time-total">{formatDuration(totalMinutes)}</p>
      <p className="study-time-label">Total study time</p>

      <div className="study-timer">
        {isRunning ? (
          <>
            <div className="study-timer-info">
              <span className="study-timer-clock">{formatClock(elapsedSeconds)}</span>
              <span className="study-timer-unit">{active.unitCode || "General study"}</span>
            </div>
            <button className="study-timer-btn stop" onClick={handleStop} disabled={busy}>
              <Square size={14} />
              Stop
            </button>
          </>
        ) : (
          <>
            <select
              className="study-timer-select"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="">No unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
            </select>
            <button className="study-timer-btn start" onClick={handleStart} disabled={busy}>
              <Play size={14} />
              Start
            </button>
          </>
        )}
      </div>
      {error && <p className="study-timer-error">{error}</p>}

      <div className="study-chart">
        <div className="study-chart-axis">
          <span>{AxisMaxHours}h</span>
          <span>{(AxisMaxHours * 2) / 3}h</span>
          <span>{AxisMaxHours / 3}h</span>
          <span>0h</span>
        </div>
        <div className="study-chart-bars">
          {DAYS.map((day, i) => {
            const minutes = dailyMinutes[i] || 0;
            const heightPct = Math.min(100, (minutes / (AxisMaxHours * 60)) * 100);
            return (
              <div className="study-bar-col" key={day}>
                <div className="study-bar-track">
                  <div
                    className="study-bar-fill"
                    style={{ height: `${heightPct}%` }}
                    title={formatDuration(minutes)}
                  />
                </div>
                <span className="study-bar-label">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="study-details-link" onClick={onViewDetails}>
        View detailed statistics
      </button>
    </div>
  );
}

export default StudyTime;