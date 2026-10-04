"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/permissions";
import { helpdeskTicketSchema, ticketResponseSchema } from "@/lib/validators";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitTicket(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await assertSession(["EMPLOYEE"]);
  if (!session.employeeId) return { ok: false, error: "No employee record linked to this login." };

  const parsed = helpdeskTicketSchema.safeParse({ subject: formData.get("subject"), message: formData.get("message") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.helpdeskTicket.create({ data: { orgId: session.orgId, employeeId: session.employeeId, ...parsed.data } });

  revalidatePath("/my-helpdesk");
  revalidatePath("/helpdesk");
  return { ok: true };
}

export async function respondToTicket(
  ticketId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await assertSession(["SUPERADMIN", "HR_MANAGER"]);

  const parsed = ticketResponseSchema.safeParse({ response: formData.get("response") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const ticket = await db.helpdeskTicket.findFirst({ where: { id: ticketId, orgId: session.orgId } });
  if (!ticket) return { ok: false, error: "Ticket not found." };

  await db.helpdeskTicket.update({
    where: { id: ticketId },
    data: { response: parsed.data.response, respondedAt: new Date(), status: "RESOLVED" },
  });

  revalidatePath("/helpdesk");
  revalidatePath("/my-helpdesk");
  return { ok: true };
}
