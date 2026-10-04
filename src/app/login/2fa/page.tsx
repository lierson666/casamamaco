import { redirect } from "next/navigation";
import { verifyMfa } from "@/app/actions/auth";
import { ActionForm } from "@/app/ui/action-form";
import { Seal } from "@/app/ui/kv";
import { readMfaPending } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Mfa() {
  if (!(await readMfaPending())) redirect("/login");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-start gap-5">
        <Seal size={80} />
        <div>
          <p className="eyebrow">Segundo passo</p>
          <h1 className="mt-2 font-display text-4xl uppercase leading-none">Código</h1>
          <p className="mt-2 text-sm text-muted">Digite o código de 6 dígitos do app autenticador. Sem o celular, use um código de recuperação.</p>
        </div>
      </div>
      <ActionForm action={verifyMfa} submit="Entrar" className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Código
          <input name="code" required autoFocus autoComplete="one-time-code" inputMode="text" placeholder="000000" className="field tabular-nums tracking-[0.2em]" />
        </label>
      </ActionForm>
    </main>
  );
}
