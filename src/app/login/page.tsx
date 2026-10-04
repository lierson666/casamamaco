import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { Seal } from "@/app/ui/kv";
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
      <div className="flex flex-col items-start gap-5">
        <Seal size={96} />
        <div>
          <p className="eyebrow">Casa Mamaco</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none">Entrar</h1>
          <p className="mt-1 font-serif text-xl italic text-accent">a casa te espera.</p>
        </div>
      </div>
      <AuthForm action={login} submitLabel="Entrar" />
    </main>
  );
}
