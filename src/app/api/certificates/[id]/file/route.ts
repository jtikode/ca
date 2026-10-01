import { notFound } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const certificate = await db.certificate.findFirst({
    where: { id, orgId: session.orgId },
    select: { fileData: true, fileMimeType: true, fileName: true },
  });
  if (!certificate || !certificate.fileData || !certificate.fileMimeType) notFound();

  return new Response(new Uint8Array(certificate.fileData), {
    headers: {
      "Content-Type": certificate.fileMimeType,
      // inline (not attachment) so it opens directly in-browser and so the
      // Share button's fetch(...).blob() gets a plain image response.
      "Content-Disposition": `inline; filename="${certificate.fileName ?? "certificate"}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
