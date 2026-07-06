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

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getKstDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function toNeisDate(dateString: string) {
  return dateString.replaceAll("-", "");
}

function getKstDateObject(dateString: string) {
  return new Date(`${dateString}T12:00:00+09:00`);
}

function addDaysKst(dateString: string, days: number) {
  const date = getKstDateObject(dateString);
  date.setDate(date.getDate() + days);
  return getKstDateString(date);
}

function getThisMondayKst(todayString: string) {
  const today = getKstDateObject(todayString);
  const day = today.getDay();

  const diffToMonday = day === 0 ? -6 : 1 - day;

  today.setDate(today.getDate() + diffToMonday);

  return getKstDateString(today);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const schoolName = searchParams.get("name") ?? "대전대성고등학교";

    const todayKst = getKstDateString();
    const date = searchParams.get("date") ?? toNeisDate(todayKst);

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

    const mondayKst = getThisMondayKst(todayKst);

    const weekDates = ["월", "화", "수", "목", "금"].map((weekday, index) => {
      const dateString = addDaysKst(mondayKst, index);

      return {
        weekday,
        date: toNeisDate(dateString),
      };
    });

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