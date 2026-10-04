import { addUser } from "@/app/actions/auth";
import { ActionForm } from "@/app/ui/action-form";
import { PasswordForm } from "@/app/ui/password-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  await requireUser();
  const users = db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).all();

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <header>
        <h1 className="font-display text-[clamp(2rem,9vw,3rem)] leading-none">Usuários</h1>
      </header>

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
        <h2 className="mb-3 text-sm font-medium text-muted">Trocar minha senha</h2>
        <PasswordForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Cadastrar outra pessoa</h2>
        <ActionForm action={addUser} submit="Cadastrar" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nome
            <input name="name" required autoComplete="off" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="off" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Senha
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
          </label>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Backup dos dados</h2>
        <p className="mb-3 text-sm text-muted">O servidor guarda uma cópia por dia (as últimas 30). Você também pode baixar uma agora.</p>
        <a href="/api/backup" className="btn inline-flex items-center justify-center">
          Baixar backup agora
        </a>
      </section>
    </div>
  );
}
