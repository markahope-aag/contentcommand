import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const openApiSpec = readFileSync(
      join(process.cwd(), "docs/api/openapi.yaml"),
      "utf-8"
    );
    
    return new NextResponse(openApiSpec, {
      headers: {
        "Content-Type": "application/yaml",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch {
    return NextResponse.json(
      { error: "OpenAPI specification not found" },
      { status: 404 }
    );
  }
}