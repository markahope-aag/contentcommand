import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { briefUpdateSchema, validateBody } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: brief, error } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!brief) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: brief });
  } catch (error) {
    console.error("Get brief error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(briefUpdateSchema, body);
    if (!validation.success) return validation.response;

    const { data: brief, error } = await supabase
      .from("content_briefs")
      .update(validation.data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: brief });
  } catch (error) {
    console.error("Update brief error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("content_briefs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete brief error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
