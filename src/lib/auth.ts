import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";
import { SESSION_COOKIE, verifySession } from "./session";

// Usuário da sessão atual. Só vale se a conta está ativada (2FA) e a versão da sessão confere.
export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const u = db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      enabled: schema.users.totpEnabled,
      sv: schema.users.sessionVersion,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .get();
  if (!u || !u.enabled || u.sv !== session.sv) return null;
  return { id: u.id, name: u.name, email: u.email, sv: u.sv };
});

// Chamar em toda página e Server Action protegida: o proxy só faz checagem otimista do cookie,
// a autorização real é aqui.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
