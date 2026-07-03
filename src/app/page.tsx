"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PushSubscribeButton from "@/components/PushSubscribeButton";

type Lesson = {
  grade: number;
  class: number;
  weekday: number;
  weekdayString: string;
  classTime: number;
  teacher: string;
  subject: string;
};

type MealData = {
  mealData: string[];
  ntrInfo: string[];
  origin: string[];
  calories: string;
};

type eatApiResponse = {
  school: string;
  date: string;
  today: {
    breakfast: MealData;
    lunch: MealData;
    dinner: MealData;
  };
};

type Notice = {
  id: string;
  endDate?: string;
  expiresAt?: string;
  category: string;
  title: string;
  content: string;
  important?: boolean;
  imageUrl?: string;
  createdAt?: string;
};

export default function Home() {
  const [todayTimetable, setTodayTimetable] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [todayMeals, setTodayMeals] = useState<eatApiResponse["today"] | null>(null);
  const [mealLoading, setMealLoading] = useState(true);

  const [todayNotices, setTodayNotices] = useState<Notice[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(true);

  useEffect(() => {
    async function fetchTimetable() {
      try {
        const res = await fetch("/api/timetable");
        const data: Lesson[][] = await res.json();

        // JS 요일: 일요일 0, 월요일 1, 화요일 2 ...
        // 시간표 배열: 월요일 0, 화요일 1, 수요일 2 ...
        const today = new Date().getDay();
        const todayIndex = today - 1;

        if (todayIndex >= 0 && todayIndex <= 4) {
          // 오늘 요일 시간표에서 1~7교시만 사용
          setTodayTimetable(data[todayIndex].slice(0, 7));
        } else {
          // 토요일, 일요일
          setTodayTimetable([]);
        }
      } catch (error) {
        console.error("시간표를 불러오지 못했습니다.", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchMeals() {
      try {
        const res = await fetch("/api/eating");
        const data: eatApiResponse = await res.json();

        // today.lunch = 오늘 중식
        setTodayMeals(data.today);
      } catch (error) {
        console.error("급식을 불러오지 못했습니다.", error);
      } finally {
        setMealLoading(false);
      }
    }

    function sortNotices(notices: Notice[]) {
      return [...notices].sort((a, b) => {
        if (a.important === true && b.important !== true) {
          return -1;
        }

        if (a.important !== true && b.important === true) {
          return 1;
        }

        return Number(b.id) - Number(a.id);
      });
    }

    async function fetchNotices() {
      try {
        const res = await fetch("/api/plus");

        if (!res.ok) {
          console.error("공지 API 요청 실패:", res.status);
          return;
        }

        const notices: Notice[] = await res.json();

        setTodayNotices(sortNotices(notices));
      } catch (error) {
        console.error("공지를 불러오지 못했습니다.", error);
      } finally {
        setNoticeLoading(false);
      }
    }

    fetchTimetable();
    fetchMeals();
    fetchNotices();
  }, []);

  const visibleTodayNotices = todayNotices.slice(0, 10);
  const hasMoreNotices = todayNotices.length > 10;
  return (
    <div className="box">
      <h1 className="title" style={{fontSize: 30}}>우리 반 소식</h1>
      <div style={{ margin: "12px 0" }}>
        <PushSubscribeButton />
      </div>
      <div className="sub-box">
        <h2 className="sub-title">[오늘의 시간표]</h2>
        <div className="mt-5 mb-5">
          {loading ? (
            <p>시간표를 불러오는 중...</p>
          ) : todayTimetable.length > 0 ? (
            todayTimetable.map((lesson) => (
              <p key={lesson.classTime}>
                {lesson.classTime}교시 : {lesson.subject || "-"}
              </p>
            ))
          ) : (
            <p>오늘은 시간표가 없습니다.</p>
          )}
        </div>
      </div>
        <div className="sub-box">
          <h3 className="sub-title">[공지]</h3>
          <div className="mt-5 mb-5">
            {noticeLoading ? (
              <p>공지를 불러오는 중...</p>
            ) : todayNotices.length > 0 ? (
              <>
                {visibleTodayNotices.map((notice) => (
                  <div key={notice.id} className="notice-item">
                    <p>
                      <Link href={`/noticelist/${notice.id}`} className="notice-link">
                        {notice.important && <span className="important-label">[중요]</span>}{" "}
                        <span className="notice-category">[{notice.category}]</span>{" "}
                        <strong>{notice.title}</strong>
                      </Link>
                    </p>
                  </div>
                ))}

                {hasMoreNotices && (
                  <div className="more-notice-box">
                    <Link href="/notice" className="more-notice-link">
                      더보기
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p>오늘의 공지가 없습니다.</p>
            )}
          </div>
        </div>
      <div className="sub-box">
        <h4 className="sub-title">[오늘의 급식]</h4>
        <div className="mt-5 mb-5">
            {mealLoading ? (
              <p>급식을 불러오는 중...</p>
            ) : todayMeals ? (
              <>
                <h5 className="title">조식</h5>
                {todayMeals.breakfast.mealData.length > 0 ? (
                  <>
                    {todayMeals.breakfast.mealData.map((menu, index) => (
                      <p key={`breakfast-${index}`}>{menu}</p>
                    ))}
                  </>
                ) : (
                  <p>조식 정보가 없습니다.</p>
                )}

                <h5 className="title">중식</h5>
                {todayMeals.lunch.mealData.length > 0 ? (
                  <>
                    {todayMeals.lunch.mealData.map((menu, index) => (
                      <p key={`lunch-${index}`}>{menu}</p>
                    ))}
                  </>
                ) : (
                  <p>중식 정보가 없습니다.</p>
                )}

                <h5 className="title">석식</h5>
                {todayMeals.dinner.mealData.length > 0 ? (
                  <>
                    {todayMeals.dinner.mealData.map((menu, index) => (
                      <p key={`dinner-${index}`}>{menu}</p>
                    ))}
                  </>
                ) : (
                  <p>석식 정보가 없습니다.</p>
                )}
              </>
            ) : (
              <p>오늘은 급식 정보가 없습니다.</p>
            )}
          </div>
      </div>
    </div>
  );
}