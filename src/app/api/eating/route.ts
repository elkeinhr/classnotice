import { NextResponse } from "next/server";

interface SchoolData {
  regionCode: string;
  schoolCode: string;
  schoolName: string;
  schoolWebsite: string;
  schoolFax: string;
  schoolAddress: string;
}

interface MealData {
  mealData: string[];
  ntrInfo: string[];
  origin: string[];
  calories: string;
}

async function getSchool(name: string): Promise<SchoolData[]> {
  const schoolAPI =
    "https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=100&SCHUL_NM=";

  let schools: SchoolData[] = [];

  const res = await fetch(`${schoolAPI}${encodeURIComponent(name)}`);
  const json = await res.json();

  try {
    const rows = json["schoolInfo"]?.[1]?.["row"];

    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        const schoolData = rows[i];

        schools.push({
          regionCode: schoolData.ATPT_OFCDC_SC_CODE,
          schoolCode: schoolData.SD_SCHUL_CODE,
          schoolName: schoolData.SCHUL_NM,
          schoolWebsite: schoolData.HMPG_ADRES,
          schoolFax: schoolData.ORG_FAXNO,
          schoolAddress: schoolData.ORG_RDNMA,
        });
      }
    }
  } catch (e) {
    console.error("학교 조회 오류:", e);
    schools = [];
  }

  return schools;
}

async function getMeal(
  date: string,
  regionCode: string,
  schoolCode: string,
  mealCode: "1" | "2" | "3"
): Promise<MealData> {
  const lunchAPI = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pSize=100&ATPT_OFCDC_SC_CODE=${regionCode}&SD_SCHUL_CODE=${schoolCode}&MMEAL_SC_CODE=${mealCode}&MLSV_YMD=${date}`;

  const res = await fetch(lunchAPI);
  const json = await res.json();

  try {
    const row = json.mealServiceDietInfo[1]["row"][0];

    return {
      mealData: row["DDISH_NM"].split("<br/>"),
      ntrInfo: row["NTR_INFO"].split("<br/>"),
      origin: row["ORPLC_INFO"].split("<br/>"),
      calories: row["CAL_INFO"],
    };
  } catch (e) {
    return {
      mealData: [],
      ntrInfo: [],
      origin: [],
      calories: "",
    };
  }
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getTodayDateString() {
  return formatDate(new Date());
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();

  const monday = new Date(today);

  // JS 기준: 일요일 0, 월요일 1, 화요일 2 ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  monday.setDate(today.getDate() + diffToMonday);

  const weekdays = ["월", "화", "수", "목", "금"];

  return weekdays.map((weekday, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      weekday,
      date: formatDate(date),
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const schoolName = searchParams.get("name") ?? "대전대성고등학교";
    const date = searchParams.get("date") ?? getTodayDateString();

    const schools = await getSchool(schoolName);

    const mySchool = schools.find((school) => {
      return school.schoolName === schoolName;
    });

    if (!mySchool) {
      return NextResponse.json(
        { error: "학교를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    const breakfast = await getMeal(
    date,
    mySchool.regionCode,
    mySchool.schoolCode,
    "1"
    );

    const lunch = await getMeal(
    date,
    mySchool.regionCode,
    mySchool.schoolCode,
    "2"
    );

    const dinner = await getMeal(
    date,
    mySchool.regionCode,
    mySchool.schoolCode,
    "3"
    );

    const weekDates = getWeekDates();

    const weekLunch = await Promise.all(
      weekDates.map(async (dayInfo) => {
        const breakfast = await getMeal(
            dayInfo.date,
            mySchool.regionCode,
            mySchool.schoolCode,
            "1"
        );

        const lunch = await getMeal(
            dayInfo.date,
            mySchool.regionCode,
            mySchool.schoolCode,
            "2"
        );

        const dinner = await getMeal(
            dayInfo.date,
            mySchool.regionCode,
            mySchool.schoolCode,
            "3"
        );

        return {
          weekday: dayInfo.weekday,
          date: dayInfo.date,
          breakfast,
          lunch,
          dinner,
        };
      })
    );

    return NextResponse.json({
        school: mySchool.schoolName,
        date,
        today: {
            breakfast,
            lunch,
            dinner,
        },
        week: weekLunch,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "급식 정보를 불러오는 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}