"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

function formatDateTime(dateString?: string) {
  if (!dateString) {
    return "정보 없음";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "정보 없음";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export default function NoticeDetailPage() {
  const params = useParams();

  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotice() {
      try {
        console.log("현재 공지 ID:", id);

        const res = await fetch("/api/plus");

        console.log("공지 API 상태:", res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error("공지 API 오류 응답:", text);
          return;
        }

        const notices: Notice[] = await res.json();

        console.log("전체 공지 목록:", notices);

        const foundNotice = notices.find((notice) => {
          return String(notice.id) === String(id);
        });

        console.log("찾은 공지:", foundNotice);

        setNotice(foundNotice ?? null);
      } catch (error) {
        console.error("공지 상세 정보를 불러오지 못했습니다.", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchNotice();
    }
  }, [id]);

  return (
    <div className="box">
      <h1 className="title" style={{ fontSize: 30 }}>
        공지 상세
      </h1>

      <div className="sub-box">
        {loading ? (
          <p>공지를 불러오는 중...</p>
        ) : notice ? (
          <>
            <p>
              <strong>분류:</strong> {notice.category}
            </p>

            <p>
              <strong>종료일:</strong> {notice.endDate ?? "정보 없음"}
            </p>

            <p>
              <strong>자동 삭제 시간:</strong> {formatDateTime(notice.expiresAt)}
            </p>

            <h2 className="notice-detail-title">
              {notice.important && (
                <span className="important-label">[중요]</span>
              )}{" "}
              {notice.title}
            </h2>

            <p className="notice-detail-content">{notice.content}</p>

            {notice.imageUrl && (
              <img
                src={notice.imageUrl}
                alt={notice.title}
                className="notice-detail-image"
              />
            )}

            <Link href="/notice" className="notice-back-link">
              돌아가기
            </Link>
          </>
        ) : (
          <>
            <p>해당 공지를 찾을 수 없습니다.</p>
            <p>이미 종료일이 지나 자동 삭제되었을 수 있습니다.</p>

            <Link href="/notice" className="notice-back-link">
              돌아가기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}