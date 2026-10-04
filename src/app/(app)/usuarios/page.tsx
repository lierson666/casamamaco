import { addUser } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  await requireUser();
  const users = db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .all();

  return (
    <div className="flex max-w-sm flex-col gap-8">
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Quem tem acesso</h2>
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-3">
              {u.name}
              <span className="block text-xs text-zinc-500">{u.email}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Cadastrar outra pessoa</h2>
        <AuthForm action={addUser} submitLabel="Cadastrar" withName />
      </section>
    </div>
  );
}
