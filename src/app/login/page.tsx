import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  if (db.select({ n: count() }).from(schema.users).get()!.n === 0) {
    redirect("/setup");
  }
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Casa Mamaco</h1>
        <p className="text-sm text-zinc-500">Entre para ver as contas da casa.</p>
      </div>
      <AuthForm action={login} submitLabel="Entrar" />
    </main>
  );
}
