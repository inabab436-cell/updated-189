/**
 * Team (staff) management server functions.
 *
 * Listing / adding / editing / deleting staff is owner-only. `getCurrentActor`
 * is callable by anyone with a session so the dashboard can hide sections the
 * signed-in person is not allowed to open.
 *
 * Server-only modules are loaded with dynamic import() inside handlers so this
 * client-reachable module never bundles server-only code or secrets.
 */

import { createServerFn } from "@tanstack/react-start";

import {
  normalizePermissions,
  type CurrentActor,
  type StaffListResult,
  type StaffMember,
} from "@/lib/staff-types";

function ensureEmail(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) {
    throw new Error("البريد الإلكتروني غير صالح.");
  }
  return s;
}

function ensureName(value: unknown): string {
  const s = String(value ?? "").trim().replace(/\s+/g, " ");
  if (s.length < 2) throw new Error("اكتب اسم الموظف.");
  if (s.length > 80) throw new Error("الاسم طويل جدًا.");
  return s;
}

function ensureId(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!/^[0-9a-f-]{16,}$/i.test(s)) throw new Error("الموظف غير موجود.");
  return s;
}

export const getCurrentActor = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentActor> => {
    const { requireActor } = await import("@/lib/session-guard.server");
    const actor = await requireActor();
    return {
      email: actor.email,
      name: actor.name,
      isOwner: actor.isOwner,
      full_access: actor.full_access,
      permissions: actor.permissions,
    };
  },
);

export const listStaffMembers = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffListResult> => {
    const { requireOwner } = await import("@/lib/session-guard.server");
    const owner = await requireOwner();
    const { listStaff } = await import("@/lib/staff.server");
    const members = await listStaff(owner.merchantId);
    return {
      members,
      total: members.length,
      active: members.filter((m) => m.status === "active").length,
    };
  },
);

export const addStaffMember = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      email: string;
      name: string;
      permissions: string[];
      full_access?: boolean;
    }) => ({
      email: ensureEmail(data?.email),
      name: ensureName(data?.name),
      permissions: normalizePermissions(data?.permissions),
      full_access: Boolean(data?.full_access),
    }),
  )
  .handler(async ({ data }): Promise<StaffMember> => {
    const { requireOwner } = await import("@/lib/session-guard.server");
    const owner = await requireOwner();
    if (!data.full_access && data.permissions.length === 0) {
      throw new Error("اختر صلاحية واحدة على الأقل.");
    }
    if (data.email === (owner.email ?? "").trim().toLowerCase()) {
      throw new Error("هذا هو بريد صاحب الحساب.");
    }
    const { createStaff } = await import("@/lib/staff.server");
    return createStaff({
      merchantId: owner.merchantId,
      email: data.email,
      name: data.name,
      permissions: data.permissions,
      fullAccess: data.full_access,
    });
  });

export const updateStaffMember = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      name?: string;
      permissions?: string[];
      full_access?: boolean;
      status?: string;
    }) => ({
      id: ensureId(data?.id),
      name: data?.name === undefined ? undefined : ensureName(data.name),
      permissions:
        data?.permissions === undefined
          ? undefined
          : normalizePermissions(data.permissions),
      full_access: data?.full_access === undefined ? undefined : Boolean(data.full_access),
      status:
        data?.status === undefined
          ? undefined
          : data.status === "disabled"
            ? ("disabled" as const)
            : ("active" as const),
    }),
  )
  .handler(async ({ data }): Promise<StaffMember> => {
    const { requireOwner } = await import("@/lib/session-guard.server");
    const owner = await requireOwner();
    if (
      data.full_access === false &&
      data.permissions !== undefined &&
      data.permissions.length === 0
    ) {
      throw new Error("اختر صلاحية واحدة على الأقل.");
    }
    const { updateStaff } = await import("@/lib/staff.server");
    return updateStaff({
      merchantId: owner.merchantId,
      staffId: data.id,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      ...(data.full_access !== undefined ? { fullAccess: data.full_access } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    });
  });

export const removeStaffMember = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: ensureId(data?.id) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireOwner } = await import("@/lib/session-guard.server");
    const owner = await requireOwner();
    const { deleteStaff } = await import("@/lib/staff.server");
    await deleteStaff(owner.merchantId, data.id);
    return { ok: true };
  });
