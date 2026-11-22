import { useMemo } from "react";
import { BookOpen, CalendarCheck, CheckCircle2, TrendingUp } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { getDaysUntil } from "./DashboardUtils.js";
import "./OverviewStats.css";

function OverviewStats() {
    const { units, assignments } = useDashboard();
    const totalUnits = units.length;

    const stats = useMemo(() => {
        const open = assignments.filter((a) => !a.completed);

        const upcoming = open
            .map((a) => ({ ...a, daysLeft: getDaysUntil(a.dueDate) }))
            .filter((a) => a.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft);

        const dueThisWeek = upcoming.filter((a) => a.daysLeft <= 7).length;
        const nextDue = upcoming[0];

        const completedCount = assignments.filter((a) => a.completed).length;
        const assignmentProgress =
            assignments.length === 0
                ? 0
                : Math.round((completedCount / assignments.length) * 100);

        return { dueThisWeek, nextDue, completedCount, assignmentProgress };
    }, [assignments]);

    return (
        <div className="OverviewStats">
            <div className="stats-grid theme-purple">
                <div className="stats-icon">
                    <BookOpen size={22} />
                </div>
                <div>
                    <span>{totalUnits}</span>
                    <p>Total Units</p>
                    <small>Enrolled</small>
                </div>
            </div>

            <div className="stats-grid theme-red">
                <div className="stats-icon">
                    <CalendarCheck size={22} />
                </div>
                <div>
                    <span>{stats.dueThisWeek}</span>
                    <p>Assignments Due</p>
                    <small>
                        {stats.nextDue
                            ? `Next: ${stats.nextDue.daysLeft === 0
                                ? "due today"
                                : `${stats.nextDue.daysLeft}d`}`
                            : "Next 7 days"}
                    </small>
                </div>
            </div>

            <div className="stats-grid theme-green">
                <div className="stats-icon">
                    <CheckCircle2 size={22} />
                </div>
                <div>
                    <span>{stats.completedCount}</span>
                    <p>Completed</p>
                    <small>Assignments</small>
                </div>
            </div>

            <div className="stats-grid theme-orange">
                <div className="stats-icon">
                    <TrendingUp size={22} />
                </div>
                <div>
                    <span>{stats.assignmentProgress}%</span>
                    <p>Overall Progress</p>
                    <small>Across units</small>
                </div>
            </div>
        </div>
    );
}

export default OverviewStats;