import React, { useState, useEffect } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AttendanceCalendarModal({ isOpen, onClose, records = [] }) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Navigation handlers
  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  function goToToday() {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }

  // Days calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayObj = new Date(currentYear, currentMonth, 1);
  // Day of week index (0 = Sun, 1 = Mon, ..., 6 = Sat).
  // We want Monday = 0, ..., Sunday = 6.
  const rawFirstDay = firstDayObj.getDay();
  const firstDayOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;

  // Build lookup map for attendance records
  // Format keys as "YYYY-MM-DD"
  const attendanceMap = {};
  records.forEach((rec) => {
    if (rec.date || rec.clockIn) {
      const d = new Date(rec.date || rec.clockIn);
      const isoStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      attendanceMap[isoStr] = rec;
    }
  });

  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);

  // Month days array
  const gridCells = [];
  // Empty leading cells
  for (let i = 0; i < firstDayOffset; i++) {
    gridCells.push({ empty: true, id: `empty-${i}` });
  }

  let monthPresentCount = 0;
  let monthAbsentCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    dateObj.setHours(0, 0, 0, 0);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFuture = dateObj > todayObj;
    const isToday = dateObj.getTime() === todayObj.getTime();

    const isoDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = attendanceMap[isoDateStr];

    let status = "NORMAL";
    let isPresent = false;
    let isAbsent = false;

    if (record && record.clockIn) {
      isPresent = true;
      status = "PRESENT";
      monthPresentCount++;
    } else if (record && (record.status === "PRESENT" || record.status === "WORK_FROM_HOME")) {
      isPresent = true;
      status = "PRESENT";
      monthPresentCount++;
    } else if (!isFuture && !isWeekend) {
      // Past or current workday without clock-in
      isAbsent = true;
      status = "ABSENT";
      monthAbsentCount++;
    } else if (isWeekend) {
      status = "WEEKEND";
    } else {
      status = "FUTURE";
    }

    gridCells.push({
      empty: false,
      day,
      dateObj,
      isoDateStr,
      isWeekend,
      isFuture,
      isToday,
      record,
      status,
      isPresent,
      isAbsent,
    });
  }

  // Currently selected cell info
  const selectedCell = gridCells.find((c) => !c.empty && c.day === selectedDay) || gridCells.find((c) => !c.empty && c.isToday);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span style={{ fontSize: 22 }}>📅</span>
            <h2>Attendance History</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Month Nav & Controls */}
          <div className="calendar-nav-bar">
            <button className="calendar-nav-btn" onClick={prevMonth}>
              ‹ Prev
            </button>
            <div className="calendar-month-title">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <div className="calendar-nav-controls">
              <button className="calendar-nav-btn" onClick={goToToday}>
                Today
              </button>
              <button className="calendar-nav-btn" onClick={nextMonth}>
                Next ›
              </button>
            </div>
          </div>

          {/* Legend & Summary Pills */}
          <div className="calendar-summary-bar">
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot present" /> Present (Clocked In)
              </div>
              <div className="legend-item">
                <span className="legend-dot absent" /> Absent
              </div>
              <div className="legend-item">
                <span className="legend-dot weekend" /> Weekend
              </div>
            </div>
            <div className="calendar-stats-pills">
              <span className="stat-pill present-pill">✓ {monthPresentCount} Present</span>
              <span className="stat-pill absent-pill">✗ {monthAbsentCount} Absent</span>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="calendar-grid-header">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="calendar-weekday-col">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-grid">
            {gridCells.map((cell, idx) => {
              if (cell.empty) {
                return <div key={`empty-${idx}`} className="calendar-day-cell empty-cell" />;
              }

              let cellClass = "calendar-day-cell";
              if (cell.isPresent) cellClass += " present";
              else if (cell.isAbsent) cellClass += " absent";
              else if (cell.isWeekend) cellClass += " weekend";
              else if (cell.isFuture) cellClass += " future";

              if (selectedDay === cell.day) cellClass += " selected";

              return (
                <div
                  key={cell.isoDateStr}
                  className={cellClass}
                  onClick={() => setSelectedDay(cell.day)}
                >
                  <span className="day-number">{cell.day}</span>
                  {cell.isToday && <span className="day-today-badge" title="Today" />}

                  {cell.isPresent && (
                    <span className="day-status-tag">
                      <span className="status-text-full">Present</span>
                      <span className="status-text-short">P</span>
                    </span>
                  )}
                  {cell.isAbsent && (
                    <span className="day-status-tag">
                      <span className="status-text-full">Absent</span>
                      <span className="status-text-short">A</span>
                    </span>
                  )}

                  {cell.record?.clockIn && (
                    <span className="day-time-preview">
                      {new Date(cell.record.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day Detail Card */}
          {selectedCell && (
            <div className="day-detail-card">
              <div className="day-detail-info">
                <h4>
                  {selectedCell.dateObj.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h4>
                {selectedCell.record ? (
                  <p>
                    <strong>Clock In:</strong>{" "}
                    {selectedCell.record.clockIn
                      ? new Date(selectedCell.record.clockIn).toLocaleTimeString()
                      : "—"}{" "}
                    | <strong>Clock Out:</strong>{" "}
                    {selectedCell.record.clockOut
                      ? new Date(selectedCell.record.clockOut).toLocaleTimeString()
                      : "—"}{" "}
                    {selectedCell.record.workHours != null && (
                      <span>({selectedCell.record.workHours} hrs worked)</span>
                    )}
                  </p>
                ) : selectedCell.isPresent ? (
                  <p>Status recorded as Present</p>
                ) : selectedCell.isAbsent ? (
                  <p>No clock-in record found for this workday</p>
                ) : selectedCell.isWeekend ? (
                  <p>Weekend / Non-working day</p>
                ) : (
                  <p>Future date</p>
                )}
              </div>

              <div>
                {selectedCell.isPresent && <span className="day-detail-badge present">✓ PRESENT</span>}
                {selectedCell.isAbsent && <span className="day-detail-badge absent">✗ ABSENT</span>}
                {selectedCell.isWeekend && <span className="day-detail-badge weekend">WEEKEND</span>}
                {selectedCell.isFuture && <span className="day-detail-badge future">FUTURE</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
