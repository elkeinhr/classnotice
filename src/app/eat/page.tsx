"use client";

import { useEffect, useState } from "react";

type MealData = {
  mealData: string[];
  ntrInfo: string[];
  origin: string[];
  calories: string;
};

type WeekMeal = {
  weekday: string;
  date: string;
  breakfast: MealData;
  lunch: MealData;
  dinner: MealData;
};

type EatingApiResponse = {
  school: string;
  date: string;
  today: {
    breakfast: MealData;
    lunch: MealData;
    dinner: MealData;
  };
  week: WeekMeal[];
};

export default function Home() {
  const [weekMeals, setWeekMeals] = useState<WeekMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEating() {
      try {
        const res = await fetch("/api/eating");

        if (!res.ok) {
          console.error("급식 API 요청 실패:", res.status);
          return;
        }

        const data: EatingApiResponse = await res.json();

        setWeekMeals(data.week);
      } catch (error) {
        console.error("일주일 급식을 불러오지 못했습니다.", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEating();
  }, []);

  return (
    <div className="box">
      <h1 className="title" style={{ fontSize: 30 }}>
        1주일 급식
      </h1>

      <div className="sub-box">
        {loading ? (
          <p>급식을 불러오는 중...</p>
        ) : weekMeals.length > 0 ? (
          <div className="meal-table-wrapper">
            <table className="meal-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>조식</th>
                  <th>중식</th>
                  <th>석식</th>
                </tr>
              </thead>

              <tbody>
                {weekMeals.map((dayMeal) => (
                  <tr key={dayMeal.date}>
                    <td>
                      <strong>{dayMeal.weekday}</strong>
                      <br />
                      {dayMeal.date}
                    </td>

                    <td>
                      {dayMeal.breakfast.mealData.length > 0 ? (
                        <>
                          {dayMeal.breakfast.mealData.map((menu, index) => (
                            <p key={`breakfast-${dayMeal.date}-${index}`}>
                              {menu}
                            </p>
                          ))}
                        </>
                      ) : (
                        <p>조식 정보 없음</p>
                      )}
                    </td>

                    <td>
                      {dayMeal.lunch.mealData.length > 0 ? (
                        <>
                          {dayMeal.lunch.mealData.map((menu, index) => (
                            <p key={`lunch-${dayMeal.date}-${index}`}>
                              {menu}
                            </p>
                          ))}
                        </>
                      ) : (
                        <p>중식 정보 없음</p>
                      )}
                    </td>

                    <td>
                      {dayMeal.dinner.mealData.length > 0 ? (
                        <>
                          {dayMeal.dinner.mealData.map((menu, index) => (
                            <p key={`dinner-${dayMeal.date}-${index}`}>
                              {menu}
                            </p>
                          ))}
                        </>
                      ) : (
                        <p>석식 정보 없음</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>이번 주 급식 정보가 없습니다.</p>
        )}
      </div>
    </div>
  );
}