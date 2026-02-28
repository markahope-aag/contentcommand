import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrgSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("List organizations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(createOrgSchema, body);
    if (!validation.success) return validation.response;
    const { name, slug } = validation.data;

    const { data, error } = await supabase.rpc("create_org_with_owner", {
      org_name: name,
      org_slug: slug,
    });

    if (error) throw error;
    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    console.error("Create organization error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
