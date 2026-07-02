import { NextResponse } from "next/server";

const Timetable = require("comcigan-parser");

const timetable = new Timetable();

export const runtime = "nodejs";

export async function GET(request: Request) {
    await timetable.init();

    const schoolList = await timetable.search("대전대성고등학교");
    console.log("검색 결과", schoolList);

    type School = {
        name: string;
        code: string;
        region: string;
    };

    const mySchool = schoolList.find((school: School) => {
        return school.region === "대전" && school.name === "대전대성고등학교";
    });

    if (!mySchool) {
        return NextResponse.json(
            { error: "학교를 찾지 못했습니다." },
            { status: 404 }
        );
    }

    console.log("선택된 학교", mySchool);

    timetable.setSchool(mySchool.code);

    const result = await timetable.getTimetable();

    // 3학년 8반 시간표
    const classTimetable = result[3][8];

    // 각 요일에서 1~7교시까지만 남기기
    const timetableWithout8th = classTimetable.map((day: any[]) => {
        return day.slice(0, 7);
    });

    return NextResponse.json(timetableWithout8th);
}