import Image from "next/image";

// Selo redondo com o rostinho do Xepinha e do Oli.
export function Seal({ size = 120 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full border-[3px] border-accent bg-[#f6e7cb]"
      style={{ width: size, height: size }}
    >
      <Image src="/icons/icon-512.png" alt="Xepinha e Oli" width={size * 2} height={size * 2} priority />
    </span>
  );
}

// Moldura de xilogravura em volta da tela (aparece só no tema cordel).
export function Frame() {
  return <div aria-hidden className="kv-frame" />;
}

// Banner do Painel: a cena da xilogravura e, por cima, a única pergunta que importa (quanto sobra).
export function Kv({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="card card-hero overflow-hidden">
      <div className="flex items-start justify-between gap-6 p-5 pb-3 md:p-8 md:pb-4">
        <div className="min-w-0">
          <h1 className="h1">{title}</h1>
          {lead && <p className="mt-1 max-w-[52ch] text-muted">{lead}</p>}
          {children && <div className="mt-5">{children}</div>}
        </div>
      </div>
      {/* Cena da xilogravura: sol, passarinhos, cactos, Xepinha e Oli (só no cordel) */}
      <Image
        src="/kv/banner.png"
        alt="Xepinha, o cachorro, e Oli, o gato, sentados no sertão sob o sol"
        width={1600}
        height={520}
        sizes="(min-width: 1024px) 900px, 100vw"
        className="kv-art h-auto w-full px-2"
        priority
      />
      <div className="zigzag" />
    </section>
  );
}
