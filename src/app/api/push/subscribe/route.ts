import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "구독 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subscription.endpoint,
        subscription,
      },
      {
        onConflict: "endpoint",
      }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "푸시 알림 구독이 저장되었습니다.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "푸시 알림 구독 저장 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}