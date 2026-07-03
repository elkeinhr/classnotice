import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";

function getTodayKstDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
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

    const todayKst = getTodayKstDateString();

    const { data: notices, error } = await supabase
      .from("notices")
      .select("id, category, title, end_date, expiry_alert_sent_at")
      .eq("end_date", todayKst)
      .is("expiry_alert_sent_at", null);

    if (error) {
      throw error;
    }

    if (!notices || notices.length === 0) {
      return NextResponse.json({
        message: "오늘 종료되는 공지가 없습니다.",
      });
    }

    for (const notice of notices) {
      await sendPushToAll({
        title: "오늘 종료되는 공지가 있습니다",
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
      message: "삭제 예정 알림을 보냈습니다.",
      count: notices.length,
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