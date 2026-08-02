import { notFound } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { grossFromEarnings } from "@/lib/statutory";
import { OfferLetterDocument } from "@/components/pdf/OfferLetterDocument";
import { AppointmentLetterDocument } from "@/components/pdf/AppointmentLetterDocument";
import { ExperienceLetterDocument } from "@/components/pdf/ExperienceLetterDocument";
import { RelievingLetterDocument } from "@/components/pdf/RelievingLetterDocument";

const LETTER_TYPES = ["offer", "appointment", "experience", "relieving"] as const;
type LetterType = (typeof LETTER_TYPES)[number];

function isLetterType(value: string): value is LetterType {
  return (LETTER_TYPES as readonly string[]).includes(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const { id, type } = await params;
  if (!isLetterType(type)) notFound();

  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const [org, employee] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    db.employee.findFirst({
      where: { id, orgId: session.orgId },
      include: { salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
    }),
  ]);

  if (!employee) notFound();
  if ((type === "experience" || type === "relieving") && !employee.dol) notFound();

  const orgName = org.legalName ?? org.name;
  const orgAddress = org.address ?? "[Company address — add in Settings]";
  const designation = employee.designation ?? employee.employeeCode;
  const structure = employee.salaryStructures[0];

  let buffer: Buffer;

  if (type === "offer") {
    const earnings = structure
      ? {
          basic: Number(structure.basic),
          hra: Number(structure.hra),
          conveyance: Number(structure.conveyance),
          medicalAllowance: Number(structure.medicalAllowance),
          specialAllowance: Number(structure.specialAllowance),
        }
      : { basic: 0, hra: 0, conveyance: 0, medicalAllowance: 0, specialAllowance: 0 };
    const ctcAnnual = grossFromEarnings(earnings) * 12;

    buffer = await renderToBuffer(
      OfferLetterDocument({
        orgName,
        orgAddress,
        employeeName: employee.name,
        designation,
        doj: employee.doj,
        ctcAnnual,
        employmentBasis: employee.employmentBasis,
        employmentStage: employee.employmentStage,
      }),
    );
  } else if (type === "appointment") {
    const earnings = structure
      ? {
          basic: Number(structure.basic),
          hra: Number(structure.hra),
          conveyance: Number(structure.conveyance),
          medicalAllowance: Number(structure.medicalAllowance),
          specialAllowance: Number(structure.specialAllowance),
        }
      : { basic: 0, hra: 0, conveyance: 0, medicalAllowance: 0, specialAllowance: 0 };
    const grossMonthly = grossFromEarnings(earnings);
    const leavePolicy = await db.leavePolicy.findUnique({ where: { state: employee.state } });

    buffer = await renderToBuffer(
      AppointmentLetterDocument({
        orgName,
        orgAddress,
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        designation,
        doj: employee.doj,
        employmentBasis: employee.employmentBasis,
        employmentStage: employee.employmentStage,
        probationEndDate: employee.probationEndDate,
        employeeCategory: employee.employeeCategory,
        earnings,
        grossMonthly,
        pfApplicable: org.pfApplicable && employee.pfApplicable,
        esiApplicable: org.esiApplicable && employee.esiApplicable,
        ptApplicable: employee.ptApplicable,
        leavePolicy: leavePolicy
          ? {
              casualLeavePerYear: leavePolicy.casualLeavePerYear,
              sickLeavePerYear: leavePolicy.sickLeavePerYear,
              earnedLeavePerYear: leavePolicy.earnedLeavePerYear,
            }
          : null,
      }),
    );
  } else if (type === "experience") {
    buffer = await renderToBuffer(
      ExperienceLetterDocument({
        orgName,
        orgAddress,
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        designation,
        doj: employee.doj,
        dol: employee.dol!,
        employmentBasis: employee.employmentBasis,
        employeeCategory: employee.employeeCategory,
      }),
    );
  } else {
    buffer = await renderToBuffer(
      RelievingLetterDocument({
        orgName,
        orgAddress,
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        designation,
        dol: employee.dol!,
      }),
    );
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${type}-letter-${employee.employeeCode}.pdf"`,
    },
  });
}
