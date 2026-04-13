import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default function AdminPage() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return <AdminPanel />;
}
