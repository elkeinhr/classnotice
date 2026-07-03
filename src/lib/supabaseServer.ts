import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);