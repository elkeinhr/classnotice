"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();

      if (!endDate) {
        alert("종료일을 선택해주세요.");
        return;
      }

      if (!category || !title || !content) {
        alert("분류, 제목, 내용을 모두 입력해주세요.");
        return;
      }

      try {
        const formData = new FormData();

        formData.append("endDate", endDate);
        formData.append("category", category);
        formData.append("title", title);
        formData.append("content", content);

        if (image) {
          formData.append("image", image);
        }

        const res = await fetch("/api/plus", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "공지 저장에 실패했습니다.");
          return;
        }

        alert("공지가 추가되었습니다.");

        setEndDate("");
        setCategory("");
        setTitle("");
        setContent("");
        setImage(null);

        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
      } catch (error) {
        console.error("공지 저장 오류:", error);
        alert("공지 저장 중 오류가 발생했습니다.");
      }
    }


  return (
    <div className="box">
        <h1 className="title" style={{fontSize: 30}}> 공지 추가</h1>
        <div className="sub-box">
          <form className="notice-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-field">
                <label>공지 종료일:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>

              <div className="form-field">
                <label>분류:</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">분류 선택</option>
                  <option value="생활">생활</option>
                  <option value="학사">학사</option>
                  <option value="진로">진로</option>
                  <option value="행사">행사</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>

            <div className="form-field full">
              <label>제목</label>
              <input
                type="text"
                placeholder="공지 제목을 입력하세요"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="form-field full">
              <label>내용</label>
              <textarea
                placeholder="공지 내용을 입력하세요"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </div>

            <div className="form-field full">
              <label>사진</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImage(file);
                }}
              />
            </div>

            <button type="submit" className="notice-submit-button">
              공지 추가
            </button>
          </form>
        </div>
    </div>
  );
}