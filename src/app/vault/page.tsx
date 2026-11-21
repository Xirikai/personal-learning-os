"use client";

import { useState } from "react";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/Card";
import { NoteCard } from "@/components/NoteCard";
import { NoteForm } from "@/components/NoteForm";
import { useApp } from "@/context/AppProvider";
import { inputCls } from "@/lib/ui";

export default function VaultPage() {
  const { notes } = useApp();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = [...notes]
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt)
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)));

  return (
    <div>
      <PageHeader title="Vault" description="Заметки и организация знаний." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>Новая заметка</CardTitle>
          <NoteForm />
        </Card>
        <div className="space-y-4 lg:col-span-3">
          <input
            type="search"
            aria-label="Поиск по заметкам"
            placeholder="Поиск по заголовку, тексту и тегам"
            className={inputCls}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {shown.length === 0 ? (
            <EmptyState>{notes.length === 0 ? "Заметок пока нет. Создайте первую слева." : "Ничего не найдено."}</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {shown.map((n) => <NoteCard key={n.id} note={n} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
