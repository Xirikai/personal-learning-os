"use client";

import { useState } from "react";
import { inputCls, labelCls } from "@/lib/ui";
import { Card, CardTitle } from "./Card";

function parse(s: string): number {
  const v = s.trim().replace(",", ".");
  if (v === "" || v === "-" || v === ".") return NaN;
  return Number(v);
}
const fmt = (n: number) => String(Number(n.toFixed(6)));

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} inputMode="decimal" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function solveQuadratic(a: number, b: number, c: number): string[] {
  if ([a, b, c].some(Number.isNaN)) return ["Введите числа a, b и c."];
  if (a === 0) {
    if (b === 0) return [c === 0 ? "Решений бесконечно много." : "Решений нет."];
    return ["Это линейное уравнение.", `x = ${fmt(-c / b)}`];
  }
  const d = b * b - 4 * a * c;
  if (d < 0) return [`D = ${fmt(d)}`, "Действительных корней нет."];
  if (d === 0) return [`D = 0`, `x = ${fmt(-b / (2 * a))}`];
  const s = Math.sqrt(d);
  return [`D = ${fmt(d)}`, `x₁ = ${fmt((-b + s) / (2 * a))}`, `x₂ = ${fmt((-b - s) / (2 * a))}`];
}

export function QuadraticSolver() {
  const [a, setA] = useState("1");
  const [b, setB] = useState("-3");
  const [c, setC] = useState("2");
  const lines = solveQuadratic(parse(a), parse(b), parse(c));
  return (
    <Card>
      <CardTitle>Квадратное уравнение</CardTitle>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">ax² + bx + c = 0</p>
      <div className="grid grid-cols-3 gap-3">
        <Field id="q-a" label="a" value={a} onChange={setA} />
        <Field id="q-b" label="b" value={b} onChange={setB} />
        <Field id="q-c" label="c" value={c} onChange={setC} />
      </div>
      <div aria-live="polite" className="mt-4 space-y-1 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100">
        {lines.map((l) => <p key={l}>{l}</p>)}
      </div>
    </Card>
  );
}

export function PercentTool() {
  const [p, setP] = useState("15");
  const [x, setX] = useState("200");
  const [part, setPart] = useState("30");
  const [whole, setWhole] = useState("120");

  const pn = parse(p), xn = parse(x), partN = parse(part), wholeN = parse(whole);
  const r1 = Number.isNaN(pn) || Number.isNaN(xn) ? "Введите числа." : `${fmt((pn / 100) * xn)}`;
  const r2 = Number.isNaN(partN) || Number.isNaN(wholeN) ? "Введите числа." : wholeN === 0 ? "Делить на ноль нельзя." : `${fmt((partN / wholeN) * 100)} %`;

  return (
    <Card>
      <CardTitle>Проценты</CardTitle>
      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Сколько составляет P % от X</p>
      <div className="grid grid-cols-2 gap-3">
        <Field id="p-p" label="P, %" value={p} onChange={setP} />
        <Field id="p-x" label="X" value={x} onChange={setX} />
      </div>
      <p aria-live="polite" className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-medium dark:bg-slate-800">Результат: {r1}</p>

      <p className="mb-2 mt-6 text-sm text-slate-500 dark:text-slate-400">Сколько процентов A составляет от B</p>
      <div className="grid grid-cols-2 gap-3">
        <Field id="p-a" label="A" value={part} onChange={setPart} />
        <Field id="p-b" label="B" value={whole} onChange={setWhole} />
      </div>
      <p aria-live="polite" className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-medium dark:bg-slate-800">Результат: {r2}</p>
    </Card>
  );
}
