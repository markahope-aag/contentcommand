import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateCache } from "@/lib/cache";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get("key");
  if (!key || !key.startsWith("cc:")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  await invalidateCache(key, `${key}:*`);
  return NextResponse.json({ ok: true });
}
