"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const noticesPerPage = 20;

  function sortNotices(notices: Notice[]) {
    return [...notices].sort((a, b) => {
      if (a.important === true && b.important !== true) {
        return -1;
      }

      if (a.important !== true && b.important === true) {
        return 1;
      }

      return Number(b.id) - Number(a.id);
    });
  }

  useEffect(() => {
    fetchNotices();
  }, []);

  async function fetchNotices() {
    try {
      const res = await fetch("/api/plus");

      if (!res.ok) {
        console.error("공지 API 요청 실패:", res.status);
        return;
      }

      const data: Notice[] = await res.json();

      setNotices(sortNotices(data));
    } catch (error) {
      console.error("공지를 불러오지 못했습니다.", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotice(id: string) {
    const check = confirm("정말 이 공지를 삭제하시겠습니까?");

    if (!check) {
      return;
    }

    try {
      const res = await fetch(`/api/plus?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "공지 삭제에 실패했습니다.");
        return;
      }

      alert("공지가 삭제되었습니다.");

      setNotices((prevNotices) => {
        const updatedNotices = prevNotices.filter((notice) => notice.id !== id);

        const updatedTotalPages = Math.ceil(updatedNotices.length / noticesPerPage);

        if (currentPage > updatedTotalPages && updatedTotalPages > 0) {
          setCurrentPage(updatedTotalPages);
        }

        return updatedNotices;
      });
    } catch (error) {
      console.error("공지 삭제 오류:", error);
      alert("공지 삭제 중 오류가 발생했습니다.");
    }
  }
  async function toggleImportant(id: string, currentImportant?: boolean) {
    try {
      const res = await fetch("/api/plus", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          important: !currentImportant,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "중요 표시 변경에 실패했습니다.");
        return;
      }

      setNotices((prevNotices) => {
        const updatedNotices = prevNotices.map((notice) => {
          if (notice.id === id) {
            return {
              ...notice,
              important: !currentImportant,
            };
          }

          return notice;
        });

        return sortNotices(updatedNotices);
      });
    } catch (error) {
      console.error("중요 표시 변경 오류:", error);
      alert("중요 표시 변경 중 오류가 발생했습니다.");
    }
  }

  const totalPages = Math.ceil(notices.length / noticesPerPage);

  const startIndex = (currentPage - 1) * noticesPerPage;
  const endIndex = startIndex + noticesPerPage;

  const currentNotices = notices.slice(startIndex, endIndex);

  return (
    <div className="box">
      <h1 className="title" style={{ fontSize: 30 }}>
        공지사항
      </h1>
      <div className="link-box">
        <Link href="/plus" className="link-box-link">
          공지 추가
        </Link>
      </div>
      <div className="sub-box">
        {loading ? (
          <p>공지를 불러오는 중...</p>
        ) : notices.length > 0 ? (
        <>
          {currentNotices.map((notice) => (
            <div key={notice.id} className="notice-manage-item">
              <div className="notice-manage-info">
                <Link href={`/noticelist/${notice.id}`} className="notice-link">
                  {notice.important && <span className="important-label">[중요]</span>}{" "}
                  <span className="notice-category">[{notice.category}]</span>{" "}
                  <strong>{notice.title}</strong>
                </Link>
                <p className="notice-date">
                  종료일: {notice.endDate ?? "정보 없음"}
                </p>
              </div>
              <div className="notice-button-box">
                <button
                  type="button"
                  className={
                    notice.important
                      ? "notice-important-button active"
                      : "notice-important-button"
                  }
                  onClick={() => toggleImportant(notice.id, notice.important)}
                >
                  {notice.important ? "중요 해제" : "중요"}
                </button>

                <button
                  type="button"
                  className="notice-delete-button"
                  onClick={() => deleteNotice(notice.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}

          <div className="pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => page - 1)}
              disabled={currentPage === 1}
            >
              이전
            </button>

            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                type="button"
                className={currentPage === index + 1 ? "active-page" : ""}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((page) => page + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </>
        ) : (
          <p>등록된 공지가 없습니다.</p>
        )}
      </div>
    </div>
  );
}