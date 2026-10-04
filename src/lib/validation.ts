// Campos de validação (zod) compartilhados pelas Server Actions.
import * as z from "zod";
import { parseBRL } from "./money";

export const idField = z.coerce.number().int().positive();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

// Valor em reais obrigatório (ex.: "125,90"), validado por parseBRL.
export const moneyField = (message = "Valor inválido. Exemplo: 125,90") => z.string().refine((v) => parseBRL(v) !== null, message);

// Valor em reais opcional: vazio é aceito.
export const optionalMoney = z
  .string()
  .trim()
  .refine((v) => v === "" || parseBRL(v) !== null, "Valor inválido. Exemplo: 125,90");

export const optionalDate = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.");
