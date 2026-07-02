import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type Notice = {
  id: string;
  endDate?: string;
  expiresAt?: string;
  category: string;
  title: string;
  content: string;
  important?: boolean;
  imageUrl?: string;
  imagePath?: string;
  createdAt?: string;
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const bucketName = "notice-images";

function getExpiresAt(endDate: string) {
  if (!endDate) {
    throw new Error("종료일을 선택해야 합니다.");
  }

  /**
   * 종료일 당일까지 보이게 하고,
   * 종료일 다음 날 00:00에 만료되도록 설정.
   *
   * +09:00은 한국 시간 기준.
   * 예: endDate = 2026-07-01
   * → 2026-07-02 00:00 KST에 만료
   */
  const expiresAt = new Date(`${endDate}T00:00:00+09:00`);

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error("올바르지 않은 종료일입니다.");
  }

  expiresAt.setDate(expiresAt.getDate() + 1);

  if (expiresAt.getTime() <= Date.now()) {
    throw new Error("이미 지난 날짜는 종료일로 설정할 수 없습니다.");
  }

  return expiresAt.toISOString();
}

function mapNotice(row: any): Notice {
  return {
    id: row.id,
    endDate: row.end_date,
    expiresAt: row.expires_at,
    category: row.category,
    title: row.title,
    content: row.content,
    important: row.important,
    imageUrl: row.image_url,
    imagePath: row.image_path,
    createdAt: row.created_at,
  };
}

async function deleteImageIfExists(imagePath?: string | null) {
  if (!imagePath) {
    return;
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([imagePath]);

  if (error) {
    console.log("이미지 파일 삭제 실패 또는 파일 없음:", error.message);
  }
}

async function cleanExpiredNotices() {
  const now = new Date().toISOString();

  const { data: expiredNotices, error: selectError } = await supabase
    .from("notices")
    .select("id, image_path")
    .lte("expires_at", now);

  if (selectError) {
    throw selectError;
  }

  if (!expiredNotices || expiredNotices.length === 0) {
    return;
  }

  for (const notice of expiredNotices) {
    await deleteImageIfExists(notice.image_path);
  }

  const expiredIds = expiredNotices.map((notice) => notice.id);

  const { error: deleteError } = await supabase
    .from("notices")
    .delete()
    .in("id", expiredIds);

  if (deleteError) {
    throw deleteError;
  }
}

export async function GET() {
  try {
    await cleanExpiredNotices();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .gt("expires_at", now)
      .order("important", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const notices = (data ?? []).map(mapNotice);

    return NextResponse.json(notices);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "공지를 불러오는 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const endDate = formData.get("endDate")?.toString() ?? "";
    const category = formData.get("category")?.toString() ?? "";
    const title = formData.get("title")?.toString() ?? "";
    const content = formData.get("content")?.toString() ?? "";
    const image = formData.get("image");

    if (!endDate) {
      return NextResponse.json(
        { error: "종료일을 선택해야 합니다." },
        { status: 400 }
      );
    }

    if (!category || !title || !content) {
      return NextResponse.json(
        { error: "분류, 제목, 내용을 모두 입력해야 합니다." },
        { status: 400 }
      );
    }

    let expiresAt = "";

    try {
      expiresAt = getExpiresAt(endDate);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let imageUrl = "";
    let imagePath = "";

    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "이미지 파일만 업로드할 수 있습니다." },
          { status: 400 }
        );
      }

      const maxImageSize = 10 * 1024 * 1024;

      if (image.size > maxImageSize) {
        return NextResponse.json(
          { error: "사진은 10MB 이하만 업로드할 수 있습니다." },
          { status: 400 }
        );
      }

      const originalName = image.name;
      const extension =
        originalName
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "png";

      imagePath = `${Date.now()}-${randomUUID()}.${extension}`;

      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(imagePath, buffer, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          {
            error: "사진 업로드에 실패했습니다.",
            detail: uploadError.message,
          },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(imagePath);

      imageUrl = publicUrlData.publicUrl;
    }

    const newNotice = {
      id: Date.now().toString(),
      end_date: endDate,
      expires_at: expiresAt,
      category,
      title,
      content,
      important: false,
      image_url: imageUrl,
      image_path: imagePath,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notices")
      .insert(newNotice)
      .select()
      .single();

    if (error) {
      await deleteImageIfExists(imagePath);

      return NextResponse.json(
        {
          error: "공지를 저장하는 중 오류가 발생했습니다.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(mapNotice(data), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "공지를 저장하는 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "삭제할 공지 id가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: targetNotice, error: selectError } = await supabase
      .from("notices")
      .select("id, image_path")
      .eq("id", id)
      .single();

    if (selectError || !targetNotice) {
      return NextResponse.json(
        { error: "삭제할 공지를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    await deleteImageIfExists(targetNotice.image_path);

    const { error: deleteError } = await supabase
      .from("notices")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: "공지가 삭제되었습니다.",
      deletedNotice: targetNotice,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "공지를 삭제하는 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const { id, important } = body;

    if (!id || typeof important !== "boolean") {
      return NextResponse.json(
        { error: "공지 id와 important 값이 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notices")
      .update({ important })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "수정할 공지를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "중요 표시가 수정되었습니다.",
      notice: mapNotice(data),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "중요 표시를 수정하는 중 오류가 발생했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}