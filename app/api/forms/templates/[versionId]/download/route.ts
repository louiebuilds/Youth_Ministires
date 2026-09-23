import { NextResponse } from "next/server";

import { versionIdSchema } from "@/features/forms/schemas/document-template-schema";
import { getBlankMasterDownload } from "@/features/forms/services/document-template-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const parsed = versionIdSchema.safeParse((await params).versionId);
  if (!parsed.success) return new NextResponse("Not found", { status: 404 });
  try {
    return NextResponse.redirect(await getBlankMasterDownload(parsed.data));
  } catch {
    return new NextResponse("Download is not authorized.", { status: 403 });
  }
}
