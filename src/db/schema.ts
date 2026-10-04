import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Todos os valores em centavos (inteiro). Datas em ISO "YYYY-MM-DD".
// Competência de mês em "YYYY-MM".

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Segundo fator (app autenticador). Conta só entra depois de ativada.
  totpSecret: text("totp_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  totpLastStep: integer("totp_last_step").notNull().default(0),
  // Link de ativação de uso único (guardamos só o hash).
  activationHash: text("activation_hash"),
  activationExpires: text("activation_expires"),
  // Sobe quando a senha/2FA muda: derruba as sessões antigas.
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: createdAt(),
});

export const recoveryCodes = sqliteTable("recovery_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  codeHash: text("code_hash").notNull(),
  usedAt: text("used_at"),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  kind: text("kind", { enum: ["despesa", "receita"] }).notNull(),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

// Carteira, conta corrente, conta conjunta etc.
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type", { enum: ["dinheiro", "banco", "cartao"] }).notNull(),
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

// Caixa da casa + registro de gastos: tudo que entra e sai.
export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    categoryId: integer("category_id").references(() => categories.id),
    userId: integer("user_id").references(() => users.id),
    type: text("type", { enum: ["entrada", "saida"] }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    date: text("date").notNull(),
    description: text("description").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("transactions_date_idx").on(t.date)],
);

// Modelo de conta recorrente (aluguel, Vivo, Enel...).
export const billTemplates = sqliteTable("bill_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  categoryId: integer("category_id").references(() => categories.id),
  // Nulo = ainda não informado; preenchido quando a fatura chegar.
  expectedAmountCents: integer("expected_amount_cents"),
  dueDay: integer("due_day"),
  responsible: text("responsible"),
  notes: text("notes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// Uma conta a pagar de um mês específico.
export const bills = sqliteTable(
  "bills",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    templateId: integer("template_id").references(() => billTemplates.id),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => categories.id),
    competence: text("competence").notNull(),
    dueDate: text("due_date"),
    amountCents: integer("amount_cents"),
    paidAt: text("paid_at"),
    paidByUserId: integer("paid_by_user_id").references(() => users.id),
    // Saída gerada no caixa ao marcar como paga.
    transactionId: integer("transaction_id").references(() => transactions.id),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("bills_template_competence_idx").on(t.templateId, t.competence),
    index("bills_due_idx").on(t.dueDate),
  ],
);

export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creditor: text("creditor").notNull(),
  description: text("description"),
  originalCents: integer("original_cents").notNull(),
  // Quem deve: "casal", ou o nome de quem assume a dívida.
  owner: text("owner").notNull().default("casal"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const debtPayments = sqliteTable("debt_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  debtId: integer("debt_id")
    .notNull()
    .references(() => debts.id),
  date: text("date").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paidByUserId: integer("paid_by_user_id").references(() => users.id),
  // Nulo para pagamentos históricos, anteriores ao sistema.
  transactionId: integer("transaction_id").references(() => transactions.id),
});

export const budgets = sqliteTable(
  "budgets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    month: text("month").notNull(),
    limitCents: integer("limit_cents").notNull(),
  },
  (t) => [uniqueIndex("budgets_category_month_idx").on(t.categoryId, t.month)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Movimentos importados de bancos via API (ex.: Inter PJ). Ficam separados dos
// lançamentos da casa para não misturar contas de empresa com os gastos da casa.
export const bankEntries = sqliteTable(
  "bank_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    provider: text("provider").notNull().default("inter"),
    extKey: text("ext_key").notNull(),
    date: text("date").notNull(),
    type: text("type", { enum: ["entrada", "saida"] }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [
    uniqueIndex("bank_entries_key_idx").on(t.provider, t.extKey),
    index("bank_entries_date_idx").on(t.date),
  ],
);
