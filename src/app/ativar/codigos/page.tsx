import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { finishActivation } from "@/app/actions/activation";
import { Seal } from "@/app/ui/kv";
import { RecoveryCodes } from "@/app/ui/recovery-codes";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Codigos() {
  await requireUser();
  const raw = (await cookies()).get("casa_codes")?.value;
  if (!raw) redirect("/");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-start gap-5">
        <Seal size={80} />
        <div>
          <p className="eyebrow">Conta ativada</p>
          <h1 className="mt-2 font-display text-4xl uppercase leading-none">Seus códigos</h1>
        </div>
      </div>
      <RecoveryCodes codes={raw.split(",")} />
      <form action={finishActivation}>
        <button className="btn">Guardei os códigos, entrar</button>
      </form>
    </main>
  );
}
