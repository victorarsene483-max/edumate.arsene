import { DashboardProvider } from "./DashboardContext.jsx";
import { useState, useEffect } from "react";
import OverviewStats from "./OverviewStats.jsx";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import MyUnits from "./MyUnits.jsx";
import UpcomingDeadlines from "./UpcomingDeadlines.jsx";
import StudyTime from "./Studytime.jsx";
import TodaysSchedule from "./TodaysSchedule.jsx";
import TasksDueSoon from "./TasksDueSoon.jsx";
import "./App.css";
import AIAssistant from "./AIAssistant.jsx";
import Login from "./Login.jsx";
import { apiFetch, getToken, clearToken } from "./api.js";

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));

  // Restore the session after a refresh, if a token is saved.
  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLogout() {
    clearToken();
    localStorage.removeItem("edumate_assignments");
    localStorage.removeItem("edumate_units");
    setUser(null);
  }

  if (checkingSession) {
    return <p style={{ padding: 24, color: "#6c5ce7" }}>Loading…</p>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <DashboardProvider>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="app-main">
          <TopBar user={user} />
          <div className="dashboard-body">
            <div className="main-column">
              <OverviewStats />
              <div className="units-deadlines-grid">
                <MyUnits />
                <UpcomingDeadlines />
              </div>
              <StudyTime />
            </div>
            <div className="right-column">
              <TodaysSchedule />
              <AIAssistant userName={user.name} />
            </div>
          </div>
          <TasksDueSoon />
        </div>
      </div>
    </DashboardProvider>
  );
}

export default App;