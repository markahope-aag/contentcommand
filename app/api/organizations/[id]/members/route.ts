import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addOrgMemberSchema, validateBody } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("List org members error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(addOrgMemberSchema, body);
    if (!validation.success) return validation.response;
    const { userId, role } = validation.data;

    const { data, error } = await supabase
      .from("organization_members")
      .insert({ org_id: orgId, user_id: userId, role })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Add org member error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
