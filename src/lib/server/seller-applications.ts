import { SellerApplicationStatus, UserRole } from "@prisma/client";
import { sellerApplications as fallbackApplications } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/server/notifications";
import { awardReward } from "@/lib/server/rewards";
import { ensureUserForActor, syncClerkRole } from "@/lib/server/users";
import { can } from "@/lib/rbac";
import type { Actor, SellerApplication } from "@/types/domain";
import type { SellerApplicationInput } from "@/lib/validations/seller-application";

export interface SellerApplicationForActor {
  id: string;
  businessName: string;
  categoryFocus: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt: string | null;
  notes: string | null;
}

export async function getSellerApplicationForActor(actor: Actor): Promise<SellerApplicationForActor | null> {
  if (!actor.isAuthenticated) return null;

  try {
    const user = await ensureUserForActor(actor);
    const application = await prisma.sellerApplication.findFirst({
      where: { applicantId: user.id },
      orderBy: { createdAt: "desc" }
    });
    if (!application) return null;

    return {
      id: application.id,
      businessName: application.businessName,
      categoryFocus: application.categoryFocus,
      status: application.status,
      submittedAt: application.createdAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      notes: application.notes ?? null
    };
  } catch {
    return null;
  }
}

export async function listSellerApplications(): Promise<SellerApplication[]> {
  try {
    const rows = await prisma.sellerApplication.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { applicant: true }
    });

    return rows.map((row) => ({
      id: row.id,
      applicantName: row.applicant.displayName,
      applicantEmail: row.applicant.email,
      businessName: row.businessName,
      categoryFocus: row.categoryFocus,
      status: row.status,
      submittedAt: row.createdAt.toISOString()
    }));
  } catch {
    return fallbackApplications;
  }
}

export async function createSellerApplication(actor: Actor, input: SellerApplicationInput) {
  if (!can(actor.role, "seller:apply")) return { mode: "forbidden" as const };
  const user = await ensureUserForActor(actor);
  const openApplication = await prisma.sellerApplication.findFirst({
    where: {
      applicantId: user.id,
      status: SellerApplicationStatus.PENDING
    }
  });

  if (openApplication) {
    return { mode: "existing" as const, applicationId: openApplication.id };
  }

  const application = await prisma.sellerApplication.create({
    data: {
      applicantId: user.id,
      businessName: input.businessName,
      categoryFocus: input.categoryFocus,
      experience: input.experience
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "seller_application.submitted",
      entity: "SellerApplication",
      entityId: application.id
    }
  });

  return { mode: "created" as const, applicationId: application.id };
}

export async function approveSellerApplication(actor: Actor, applicationId: string, notes?: string) {
  const reviewer = await ensureUserForActor(actor);
  const application = await prisma.$transaction(async (tx) => {
    const updated = await tx.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: SellerApplicationStatus.APPROVED,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        notes
      },
      include: { applicant: true }
    });

    await tx.user.update({
      where: { id: updated.applicantId },
      data: { role: UserRole.SELLER }
    });

    await tx.auditLog.create({
      data: {
        actorId: reviewer.id,
        action: "seller_application.approved",
        entity: "SellerApplication",
        entityId: updated.id,
        metadata: { applicantId: updated.applicantId }
      }
    });

    await awardReward(tx, {
      userId: updated.applicantId,
      type: "SELLER_APPROVED",
      sourceId: updated.id,
      metadata: { sellerApplicationId: updated.id }
    });

    return updated;
  });

  await syncClerkRole(application.applicant.clerkId, "SELLER");
  void createNotification({
    userId: application.applicantId,
    kind: "seller_approved",
    title: "Seller application approved",
    body: "Your seller account is approved. You can now create listings.",
    linkUrl: "/dashboard/seller"
  });
  void sendEmail({
    to: application.applicant.email,
    subject: "Your iHobbyWorld seller application was approved",
    text: "Your seller account is approved. You can now create listings in iHobbyWorld.",
    html: `<p>Your seller account is approved. You can now <a href="/sell/new">create listings</a> in iHobbyWorld.</p>`
  });

  return { mode: "approved" as const, applicationId };
}

export async function rejectSellerApplication(actor: Actor, applicationId: string, notes?: string) {
  const reviewer = await ensureUserForActor(actor);
  const application = await prisma.$transaction(async (tx) => {
    const updated = await tx.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: SellerApplicationStatus.REJECTED,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        notes
      },
      include: { applicant: true }
    });

    await tx.auditLog.create({
      data: {
        actorId: reviewer.id,
        action: "seller_application.rejected",
        entity: "SellerApplication",
        entityId: updated.id,
        metadata: { applicantId: updated.applicantId }
      }
    });

    return updated;
  });

  void createNotification({
    userId: application.applicantId,
    kind: "seller_rejected",
    title: "Seller application not approved",
    body: `Your seller application was not approved.${notes ? ` Reason: ${notes}` : ""}`,
    linkUrl: "/account/seller-application"
  });
  void sendEmail({
    to: application.applicant.email,
    subject: "Your iHobbyWorld seller application was not approved",
    text: `Your seller application was not approved.${notes ? ` Reason: ${notes}` : ""}`,
    html: `<p>Your seller application was not approved.${notes ? ` Reason: ${escapeHtml(notes)}` : ""}</p>`
  });

  return { mode: "rejected" as const, applicationId };
}
