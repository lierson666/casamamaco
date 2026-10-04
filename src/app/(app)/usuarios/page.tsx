import { addUser, createActivationLink } from "@/app/actions/auth";
import { ActionForm } from "@/app/ui/action-form";
import { PasswordForm } from "@/app/ui/password-form";
import { RecoveryForm } from "@/app/ui/recovery-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const me = await requireUser();
  const users = db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, enabled: schema.users.totpEnabled })
    .from(schema.users)
    .all();

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Quem tem acesso</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span>
                  {u.name}
                  {u.id === me.id && <span className="ml-2 text-xs text-muted">(você)</span>}
                  <span className="block text-xs text-muted">{u.email}</span>
                </span>
                <span className={`text-xs ${u.enabled ? "text-pos" : "text-neg"}`}>{u.enabled ? "Autenticador ativo" : "Aguardando ativação"}</span>
              </div>
              {u.id !== me.id && (
                <details className="mt-2">
                  <summary className="btn-ghost inline-block cursor-pointer list-none text-sm">Perdeu o celular ou a senha?</summary>
                  <div className="card mt-2 p-4">
                    <p className="mb-3 text-sm text-muted">
                      Gera um novo link de ativação para {u.name}. O autenticador e a senha atuais deixam de valer e os aparelhos dela são desconectados.
                    </p>
                    <ActionForm action={createActivationLink} submit="Gerar link de ativação" className="flex flex-col gap-3">
                      <input type="hidden" name="userId" value={u.id} />
                    </ActionForm>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Trocar minha senha</h2>
        <PasswordForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Códigos de recuperação</h2>
        <RecoveryForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Cadastrar outra pessoa</h2>
        <ActionForm action={addUser} submit="Cadastrar e gerar link" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nome
            <input name="name" required autoComplete="off" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="off" className="field" />
          </label>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Backup dos dados</h2>
        <p className="mb-3 text-sm text-muted">
          O servidor guarda uma cópia por dia (as últimas 30). Você também pode baixar uma agora e guardar no Drive. O arquivo tem todos os dados financeiros e as senhas (criptografadas): guarde com cuidado.
        </p>
        <a href="/api/backup" className="btn inline-flex items-center justify-center">
          Baixar backup agora
        </a>
      </section>
    </div>
  );
}
