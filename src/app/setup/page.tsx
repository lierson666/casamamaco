import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { setup } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (db.select({ n: count() }).from(schema.users).get()!.n > 0) {
    redirect("/login");
  }
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Primeiro acesso</h1>
        <p className="text-sm text-zinc-500">
          Crie a primeira conta. A segunda pessoa é cadastrada depois, dentro do
          app.
        </p>
      </div>
      <AuthForm action={setup} submitLabel="Criar conta" withName />
    </main>
  );
}
