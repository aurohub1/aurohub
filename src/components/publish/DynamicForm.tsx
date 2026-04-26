"use client";

/**
 * DynamicForm — gerador de formulário dinâmico baseado em formField do schema.
 *
 * Recebe o schema do template e renderiza campos automaticamente para cada elemento
 * que tem formField configurado. Substitui os forms hardcoded quando o template
 * define a estrutura do formulário.
 */

import { useMemo } from "react";
import type { EditorElement, EditorSchema } from "@/components/editor/types";
import { Section, Field } from "./FormSections";

/* ── Types ─────────────────────────────────────────────── */

type Fields = Record<string, string>;
type Setter = (k: string, v: string) => void;

interface DynamicFormProps {
  schema: EditorSchema;
  fields: Fields;
  set: Setter;
  onImgFundo?: (destino: string) => void;
  today?: string;
}

/* ── Helpers ───────────────────────────────────────────── */

const INPUT_CLASS =
  "h-[34px] w-full rounded-lg border border-[var(--bdr)] bg-[var(--input-bg)] px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--brand-primary,var(--orange))]";

const SELECT_CLASS =
  "h-[34px] w-full rounded-lg border border-[var(--bdr)] px-3 pr-8 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--brand-primary,var(--orange)] appearance-none";

const SELECT_STYLE = {
  background: "var(--bg2) url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjOEE5QkJGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==') right 12px center/12px no-repeat"
} as const;

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--brand-primary,var(--orange))] resize-vertical";

/** Formata valor de moeda: centavos → "R$ X.XXX,XX" */
function formatCurrency(cents: number): string {
  const reais = Math.floor(cents / 100);
  const centavos = (cents % 100).toString().padStart(2, "0");
  return `R$ ${reais.toLocaleString("pt-BR")},${centavos}`;
}

/** Parse moeda: "R$ X.XXX,XX" → centavos (number) */
function parseCurrency(value: string): number {
  const nums = value.replace(/\D/g, "");
  return nums ? parseInt(nums, 10) : 0;
}

/* ── FormField Component ──────────────────────────────── */

interface FormFieldProps {
  element: EditorElement;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  today?: string;
}

function FormField({ element, value, onChange, onBlur, today }: FormFieldProps) {
  const { formField, bindParam } = element;
  if (!formField || !bindParam) return null;

  const { inputType, placeholder, required, options, uppercase } = formField;

  const handleChange = (v: string) => {
    const finalValue = uppercase ? v.toUpperCase() : v;
    onChange(finalValue);
  };

  // Text input
  if (inputType === "text") {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className={INPUT_CLASS}
      />
    );
  }

  // Textarea
  if (inputType === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        rows={4}
        className={TEXTAREA_CLASS}
      />
    );
  }

  // Date input
  if (inputType === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        min={today}
        required={required}
        className={INPUT_CLASS}
      />
    );
  }

  // Number input
  if (inputType === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className={INPUT_CLASS}
      />
    );
  }

  // Currency input
  if (inputType === "currency") {
    const displayValue = value ? formatCurrency(parseCurrency(value)) : "";
    return (
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          const nums = e.target.value.replace(/\D/g, "");
          onChange(nums ? Math.floor(parseInt(nums, 10) / 100).toString() : "");
        }}
        onBlur={onBlur}
        placeholder={placeholder || "R$ 0,00"}
        required={required}
        className={INPUT_CLASS}
      />
    );
  }

  // Select dropdown
  if (inputType === "select" && options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        className={SELECT_CLASS}
        style={SELECT_STYLE}
      >
        <option value="">{placeholder || "Selecione..."}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // Image URL input
  if (inputType === "image") {
    return (
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder || "URL da imagem"}
        required={required}
        className={INPUT_CLASS}
      />
    );
  }

  return null;
}

/* ── DynamicForm Component ────────────────────────────── */

export default function DynamicForm({
  schema,
  fields,
  set,
  onImgFundo,
  today,
}: DynamicFormProps) {
  // Filtra elementos que têm formField configurado e agrupa por seção
  const formElements = useMemo(() => {
    if (!schema?.elements) return [];
    return schema.elements
      .filter((el) => el.formField && el.bindParam)
      .sort((a, b) => {
        // Ordena por grupo (se disponível no futuro) e depois por ordem de criação
        return 0;
      });
  }, [schema]);

  if (formElements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <p className="text-sm text-slate-400">
          Nenhum campo configurado neste template.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Configure os campos no editor de templates.
        </p>
      </div>
    );
  }

  const handleBlur = (element: EditorElement, value: string) => {
    // Se triggerImgFundo está ativo, busca imagem de fundo
    if (element.formField?.triggerImgFundo && value && onImgFundo) {
      onImgFundo(value);
    }
  };

  return (
    <div className="flex flex-col">
      <Section title="Formulário Dinâmico" icon="📋">
        {formElements.map((el) => {
          const value = fields[el.bindParam!] || "";
          return (
            <Field key={el.id} label={el.formField!.label}>
              <FormField
                element={el}
                value={value}
                onChange={(v) => set(el.bindParam!, v)}
                onBlur={() => handleBlur(el, value)}
                today={today}
              />
            </Field>
          );
        })}
      </Section>
    </div>
  );
}
