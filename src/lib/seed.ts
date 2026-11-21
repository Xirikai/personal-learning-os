import { addDays } from "./dates";
import type { Note, Task } from "./types";

export function demoTasks(): Task[] {
  const now = Date.now();
  return [
    { id: "demo-t1", title: "Решить задачи по интегралам", subject: "Математический анализ", due: addDays(0), done: false, createdAt: now - 4000 },
    { id: "demo-t2", title: "Прочитать главу 3 по алгоритмам", subject: "Алгоритмы", due: addDays(1), done: false, createdAt: now - 3000 },
    { id: "demo-t3", title: "Подготовить доклад по физике", subject: "Физика", due: addDays(3), done: false, createdAt: now - 2000 },
    { id: "demo-t4", title: "Сдать лабораторную работу", subject: "Физика", due: addDays(-1), done: false, createdAt: now - 1500 },
    { id: "demo-t5", title: "Повторить английские фразовые глаголы", subject: "Английский", due: addDays(0), done: true, createdAt: now - 1000 },
  ];
}

export function demoNotes(): Note[] {
  const now = Date.now();
  return [
    { id: "demo-n1", title: "Производная и её смысл", content: "Производная — скорость изменения функции. Геометрически это угловой коэффициент касательной.", tags: ["математика", "анализ"], createdAt: now - 3000 },
    { id: "demo-n2", title: "Сложность алгоритмов", content: "O(n log n) — сортировка слиянием. O(n²) — простые сортировки. Важно различать худший и средний случай.", tags: ["алгоритмы", "информатика"], createdAt: now - 2000 },
    { id: "demo-n3", title: "Метод интегрирования по частям", content: "∫u dv = uv − ∫v du. Выбирайте u так, чтобы производная упрощалась.", tags: ["математика", "анализ"], createdAt: now - 1000 },
  ];
}
