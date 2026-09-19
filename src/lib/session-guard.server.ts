/** Server-only session reader. In open-access mode it auto-creates the session. */
import { getSession } from "@tanstack/react-start/server";
import { getSessionConfig, type AppSessionData } from "@/lib/session.server";
import { OPEN_ACCESS } from "@/lib/open-access";

export async function requireUserId(): Promise<{ userId: string; email: string }> {
  const session = await getSession<AppSessionData>(getSessionConfig());
  if (!session.data?.userId) {
    if (OPEN_ACCESS) {
      const { ensureOpenAccessSession } = await import("@/lib/open-access.server");
      return ensureOpenAccessSession();
    }
    throw new Error("يجب تسجيل الدخول أولاً.");
  }
  return { userId: session.data.userId, email: session.data.email ?? "" };
}
