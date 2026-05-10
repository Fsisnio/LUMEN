import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/data-store";
import { getTenantId, requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const projects = await getProjects(tenantId);
    return NextResponse.json(projects);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantId(request);
    if (typeof tenant !== "string") return tenant;
    const body = await request.json();
    const project = await createProject({ ...body, organizationId: tenant });
    return NextResponse.json(project);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
