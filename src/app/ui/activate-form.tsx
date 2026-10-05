"use client";

import { useActionState } from "react";
import { activateAccount } from "@/app/actions/activation";

export function ActivateForm({ token, qr, secret }: { token: string; qr: string; secret: string }) {
  const [state, action, pending] = useActionState(activateAccount, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <section className="flex flex-col gap-2">
        <h2 className="h2 text-xl">1. Configure o autenticador</h2>
        <p className="text-sm text-muted">
          No celular, abra o Google Authenticator (ou 1Password, Authy, Microsoft Authenticator), toque em adicionar conta e leia o QR abaixo.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code do autenticador" width={220} height={220} className="rounded-lg border border-line bg-white" />
        <p className="text-xs text-muted">
          Sem câmera? Digite esta chave no app: <code className="break-all text-ink">{secret}</code>
        </p>
      </section>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        2. Código de 6 dígitos que o app mostra
        <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000000" className="field tabular-nums tracking-[0.3em]" />
      </label>
      <section className="flex flex-col gap-4">
        <h2 className="h2 text-xl">3. Crie sua senha</h2>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Senha nova (mín. 10 caracteres)
          <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Repita a senha
          <input name="password2" type="password" required minLength={10} autoComplete="new-password" className="field" />
        </label>
      </section>
      {state?.error && (
        <p role="alert" className="text-sm text-neg">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn self-start">
        {pending ? "Aguarde..." : "Ativar minha conta"}
      </button>
    </form>
  );
}
