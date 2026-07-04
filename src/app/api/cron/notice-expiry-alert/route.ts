import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";

function getKstDateString(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function addDays(date: Date, days: number) {
  const copiedDate = new Date(date);
  copiedDate.setDate(copiedDate.getDate() + days);
  return copiedDate;
}

export async function GET(request: Request) {
  try {
    const userAgent = request.headers.get("user-agent") ?? "";

    if (!userAgent.includes("vercel-cron")) {
      return NextResponse.json(
        { error: "허용되지 않은 요청입니다." },
        { status: 401 }
      );
    }

    const now = new Date();

    const todayKst = getKstDateString(now);
    const tomorrowKst = getKstDateString(addDays(now, 1));

    /**
     * 1. 종료일 전날 알림
     * 예: 오늘이 7월 4일이면, end_date가 7월 5일인 공지를 찾음
     */
    const { data: tomorrowNotices, error: tomorrowError } = await supabase
      .from("notices")
      .select("id, category, title, end_date, expiry_before_alert_sent_at")
      .eq("end_date", tomorrowKst)
      .is("expiry_before_alert_sent_at", null);

    if (tomorrowError) {
      throw tomorrowError;
    }

    for (const notice of tomorrowNotices ?? []) {
      await sendPushToAll({
        title: "내일까지 확인 가능한 공지가 있습니다",
        body: `[${notice.category}] ${notice.title}`,
        url: `/noticelist/${notice.id}`,
      });

      await supabase
        .from("notices")
        .update({
          expiry_before_alert_sent_at: new Date().toISOString(),
        })
        .eq("id", notice.id);
    }

    /**
     * 2. 종료일 당일 알림
     * 예: 오늘이 7월 5일이면, end_date가 7월 5일인 공지를 찾음
     */
    const { data: todayNotices, error: todayError } = await supabase
      .from("notices")
      .select("id, category, title, end_date, expiry_alert_sent_at")
      .eq("end_date", todayKst)
      .is("expiry_alert_sent_at", null);

    if (todayError) {
      throw todayError;
    }

    for (const notice of todayNotices ?? []) {
      await sendPushToAll({
        title: "오늘까지 확인 가능한 공지가 있습니다",
        body: `[${notice.category}] ${notice.title}`,
        url: `/noticelist/${notice.id}`,
      });

      await supabase
        .from("notices")
        .update({
          expiry_alert_sent_at: new Date().toISOString(),
        })
        .eq("id", notice.id);
    }

    return NextResponse.json({
      message: "공지 종료 알림 처리가 완료되었습니다.",
      beforeAlertCount: tomorrowNotices?.length ?? 0,
      todayAlertCount: todayNotices?.length ?? 0,
      todayKst,
      tomorrowKst,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "삭제 예정 알림 처리 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}