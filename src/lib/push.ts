import webpush from "web-push";
import { supabase } from "./supabaseServer";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  throw new Error("VAPID 환경 변수가 설정되지 않았습니다.");
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushToAll(payload: PushPayload) {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription");

  if (error) {
    throw error;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  await Promise.all(
    subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify(payload)
        );
      } catch (error: any) {
        console.log("푸시 발송 실패:", error.message);

        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", item.endpoint);
        }
      }
    })
  );
}