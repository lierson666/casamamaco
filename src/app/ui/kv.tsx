import Image from "next/image";

// Selo redondo com o rostinho do Xepinha e do Oli.
export function Seal({ size = 120 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full border-[3px] border-accent bg-[#faE9cf] shadow-[0_8px_30px_#0006]"
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

// Key visual: faixa de destaque do topo das telas.
export function Kv({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-6 p-6 pb-4 md:p-10 md:pb-6">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,7vw,4.6rem)] uppercase leading-[0.95]">
            {title}
          </h1>
          <p className="mt-1 font-serif text-[clamp(1.4rem,4vw,2.4rem)] italic leading-tight text-accent">
            {accent}
          </p>
          {children && <div className="mt-5 text-muted">{children}</div>}
        </div>
        <div className="kv-seal hidden sm:block">
          <Seal size={140} />
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
