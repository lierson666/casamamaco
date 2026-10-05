import { eq } from "drizzle-orm";
import { ActivateForm } from "@/app/ui/activate-form";
import { Seal } from "@/app/ui/kv";
import { db, schema } from "@/db";
import { userForActivation } from "@/lib/activation";
import { newTotpSecret, qrFor } from "@/lib/totp";

export const dynamic = "force-dynamic";

export default async function Ativar({ searchParams }: PageProps<"/ativar">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : undefined;
  const user = userForActivation(token);

  let body: React.ReactNode;
  if (!user || !token) {
    body = <p className="card p-4 text-sm text-neg">Link inválido ou expirado. Peça um novo para quem já tem acesso.</p>;
  } else {
    // O segredo fica guardado (ainda desligado) até a pessoa confirmar o primeiro código.
    let secret = user.totpSecret;
    if (!secret) {
      secret = newTotpSecret();
      db.update(schema.users).set({ totpSecret: secret }).where(eq(schema.users.id, user.id)).run();
    }
    body = <ActivateForm token={token} qr={await qrFor(secret, user.email)} secret={secret.match(/.{1,4}/g)!.join(" ")} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-start gap-5">
        <Seal size={80} />
        <div>
          <h1 className="h1">Ativar acesso</h1>
          {user && <p className="mt-2 text-sm text-muted">Olá, {user.name}. Vamos proteger a sua conta em três passos.</p>}
        </div>
      </div>
      {body}
    </main>
  );
}
