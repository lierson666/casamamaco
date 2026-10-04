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
        <h2 className="mb-2 text-sm font-medium text-muted">Quem tem acesso</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-3">
              {u.name}
              <span className="block text-xs text-muted">{u.email}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Cadastrar outra pessoa</h2>
        <AuthForm action={addUser} submitLabel="Cadastrar" withName />
      </section>
    </div>
  );
}
