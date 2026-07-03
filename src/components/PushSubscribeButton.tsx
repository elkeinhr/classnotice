"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index++) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export default function PushSubscribeButton() {
  async function subscribePush() {
    if (!("serviceWorker" in navigator)) {
      alert("이 브라우저는 Service Worker를 지원하지 않습니다.");
      return;
    }

    if (!("PushManager" in window)) {
      alert("이 브라우저는 푸시 알림을 지원하지 않습니다.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("알림 권한이 허용되지 않았습니다.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      alert("푸시 공개 키가 설정되지 않았습니다.");
      return;
    }

    const existingSubscription =
      await registration.pushManager.getSubscription();

    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    if (!res.ok) {
      alert("알림 구독 저장에 실패했습니다.");
      return;
    }

    alert("공지 알림을 받을 수 있습니다.");
  }

    return (
    <button
        type="button"
        onClick={subscribePush}
        style={{
        width: "100%",
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid #333",
        backgroundColor: "white",
        fontWeight: "bold",
        cursor: "pointer",
        }}
    >
        공지 알림 받기
    </button>
    );
}