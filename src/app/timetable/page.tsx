"use client";

import { useEffect, useState } from "react";

type Lesson = {
  grade: number;
  class: number;
  weekday: number;
  weekdayString: string;
  classTime: number;
  teacher: string;
  subject: string;
};

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<Lesson[][]>([]);

  const days = ["월", "화", "수", "목", "금"];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    async function fetchTimetable() {
      const res = await fetch("/api/timetable");
      const data = await res.json();

      setTimetable(data);
    }

    fetchTimetable();
  }, []);

  return (
    <div className="box">
      <h1 className="title" style={{fontSize: 30}}> 1주일 시간표</h1>
      <div className="sub-box">
        <table className="timetable-table">
          <thead style={{borderBottom: "1px solid #ccc"}}>
            <tr>
              <th>교시</th>
              {days.map((day, dayIndex) => (
                <th key={`header-${dayIndex}`}>{day}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {periods.map((period, periodIndex) => (
              <tr key={`period-${period}`}>
                <td>{period}교시</td>

                {days.map((_day, dayIndex) => {
                  const lesson = timetable[dayIndex]?.[periodIndex];

                  return (
                    <td key={`${periodIndex}-${dayIndex}`}>
                      <strong>{lesson?.subject || "-"}</strong>
                      <br />
                      <span>{lesson?.teacher || ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    
  );
}