import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { setup } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { Seal } from "@/app/ui/kv";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (db.select({ n: count() }).from(schema.users).get()!.n > 0) {
    redirect("/login");
  }
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-start gap-5">
        <Seal size={96} />
        <div>
          <p className="eyebrow">Primeiro acesso</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none">Criar conta</h1>
          <p className="mt-2 text-sm text-muted">
            Esta é a conta de quem configura. A segunda pessoa é cadastrada depois, dentro do app.
          </p>
        </div>
      </div>
      <AuthForm action={setup} submitLabel="Criar conta" withName />
    </main>
  );
}
