import "./TodaysSchedule.css";
import { useDashboard } from "./DashboardContext";
import { formatTime12h } from "./DashboardUtils.js";

function TodaysSchedule() {
  const { units, timetable } = useDashboard();
  const today = new Date().getDay();

  const todaysItems = timetable
    .filter((entry) => entry.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((entry) => {
      const unit = units.find((u) => u.id === entry.unitId);
      return {
        id: entry.id,
        startTime: formatTime12h(entry.startTime),
        endTime: formatTime12h(entry.endTime),
        title: unit ? `${unit.code} ${unit.name}` : entry.unitCode,
        location: entry.location,
        color: unit ? unit.color : "purple",
      };
    });

  return (
    <div className="schedule-card">
      <div className="schedule-header">
        <h3>Today's Schedule</h3>
        <a href="#" className="view-calendar">View Calendar</a>
      </div>

      {todaysItems.length === 0 ? (
        <p className="schedule-empty">No classes scheduled today.</p>
      ) : (
        <ul className="schedule-list">
          {todaysItems.map(({ id, startTime, endTime, title, location, color }) => (
            <li className={`schedule-item theme-${color}`} key={id}>
              <div className="schedule-time">
                <span>{startTime}</span>
                <span>{endTime}</span>
              </div>
              <div className="schedule-bar" />
              <div className="schedule-info">
                <p className="schedule-title">{title}</p>
                <p className="schedule-location">{location}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TodaysSchedule;