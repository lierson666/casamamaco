// Dados iniciais da casa. Seguro rodar mais de uma vez: só insere o que falta
// e só cadastra as dívidas se a tabela estiver vazia.
// Não grava documentos pessoais (CPF/RG/dados bancários) nem usuários/senhas:
// as contas são criadas no servidor com `npm run user:create`.
import { count, eq } from "drizzle-orm";
import { db, schema } from "./index";

const { categories, accounts, billTemplates, debts, debtPayments } = schema;

const despesas = [
  "Moradia",
  "Contas de consumo",
  "Educação",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Cartão de crédito",
  "Pensão",
  "Dívidas",
  "Outros",
];
const receitas = ["Salário", "Retirada XEPA", "Outras receitas"];

db.insert(categories)
  .values([
    ...despesas.map((name) => ({ name, kind: "despesa" as const })),
    ...receitas.map((name) => ({ name, kind: "receita" as const })),
  ])
  .onConflictDoNothing()
  .run();

db.insert(accounts)
  .values([
    { name: "Carteira (dinheiro)", type: "dinheiro" },
    { name: "Conta conjunta Inter", type: "banco" },
  ])
  .onConflictDoNothing()
  .run();

const catId = (name: string) =>
  db.select().from(categories).where(eq(categories.name, name)).get()!.id;

// Valores em branco: preencher no app quando a fatura chegar.
db.insert(billTemplates)
  .values([
    {
      name: "Vivo",
      categoryId: catId("Contas de consumo"),
    },
    {
      name: "Claro (banda larga)",
      categoryId: catId("Contas de consumo"),
      dueDay: 20,
      notes: "Fatura emitida no CNPJ da XEPA, mas a despesa é da casa.",
    },
    {
      name: "Enel (casa Ametista)",
      categoryId: catId("Contas de consumo"),
      notes:
        "Instalação 0046789448. Ainda não há conta cadastrada para a casa nova.",
    },
    {
      name: "Hospedagem Casa Mamaco (VPS Hostinger KVM 2)",
      categoryId: catId("Outros"),
      expectedAmountCents: 10_899,
      notes:
        "Servidor do sistema da casa. 1º mês R$ 70,99 (contratado em 04/10/2026); renova por R$ 108,99/mês. Planos de 12 e 24 meses saem mais baratos por mês.",
    },
    { name: "Aluguel", categoryId: catId("Moradia") },
    {
      name: "Escola do Miguel",
      categoryId: catId("Educação"),
      responsible: "Lierson",
    },
    { name: "Cartão Bradesco", categoryId: catId("Cartão de crédito") },
    {
      name: "Pensão",
      categoryId: catId("Pensão"),
      responsible: "Samantha",
    },
  ])
  .onConflictDoNothing()
  .run();

if (db.select({ n: count() }).from(debts).get()!.n === 0) {
  const insertDebt = (d: typeof debts.$inferInsert) =>
    db.insert(debts).values(d).returning({ id: debts.id }).get().id;

  const rolandinho = insertDebt({
    creditor: "Rolandinho",
    description: "Dívida do casal. Total original R$ 26.400.",
    originalCents: 2_640_000,
    owner: "casal",
  });
  const pagamentos: [string, number][] = [
    ["2025-11-07", 100_000],
    ["2025-12-11", 100_000],
    ["2026-01-20", 100_000],
    ["2026-02-11", 100_000],
    ["2026-03-19", 100_000],
    ["2026-05-02", 200_000],
    ["2026-09-11", 300_000],
  ];
  db.insert(debtPayments)
    .values(
      pagamentos.map(([date, amountCents]) => ({
        debtId: rolandinho,
        date,
        amountCents,
      })),
    )
    .run();

  for (const [creditor, originalCents, description] of [
    ["Marcela", 100_000, null],
    ["Pensão atrasada", 300_000, "Pensão em atraso."],
    ["Mariana", 400_000, null],
    ["Douglas", 700_000, null],
  ] as const) {
    insertDebt({ creditor, originalCents, description, owner: "Samantha" });
  }
}

console.log("Seed concluído.");
