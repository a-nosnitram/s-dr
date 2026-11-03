"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Category = "Личное" | "Учёба" | "Работа" | "Здоровье";
type Achievement = { id: string; title: string; note: string; category: Category; date: string };

const STORAGE_KEY = "nadezhda-achievements-v1";
const categories: Category[] = ["Личное", "Учёба", "Работа", "Здоровье"];
const starterAchievements: Achievement[] = [{ id: "first-step", title: "Начало пути", note: "Создан личный журнал достижений.", category: "Личное", date: "2026-11-03" }];

function PixelChest() {
  return <svg className="pixel-chest" viewBox="0 0 88 72" role="img" aria-label="Пиксельный сундук"><g shapeRendering="crispEdges">
    <rect x="12" y="16" width="64" height="8" fill="#3b2538"/><rect x="4" y="24" width="80" height="24" fill="#3b2538"/>
    <rect x="12" y="16" width="56" height="8" fill="#d7894d"/><rect x="12" y="24" width="64" height="16" fill="#b85f44"/>
    <rect x="12" y="24" width="8" height="8" fill="#efb35c"/><rect x="68" y="24" width="8" height="8" fill="#7e3e42"/>
    <rect x="4" y="40" width="80" height="8" fill="#efb35c"/><rect x="8" y="48" width="72" height="20" fill="#3b2538"/>
    <rect x="16" y="48" width="56" height="16" fill="#9d4e43"/><rect x="36" y="36" width="16" height="20" fill="#3b2538"/>
    <rect x="40" y="40" width="8" height="12" fill="#f7cf6c"/>
  </g></svg>;
}

function categoryIcon(category: Category) {
  return ({ Личное: "★", Учёба: "◆", Работа: "▰", Здоровье: "+" } as Record<Category, string>)[category];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function AddAchievementForm({ onAdd }: { onAdd: (item: Achievement) => void }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<Category>("Личное");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onAdd({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: cleanTitle, note: note.trim(), category, date });
    setTitle(""); setNote("");
  }

  return <form className="quest-form pixel-panel" onSubmit={submit}>
    <div className="panel-title"><span className="tiny-spark">+</span><h2>Новое достижение</h2></div>
    <label><span>Что получилось?</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: закончила важный проект" maxLength={80} required /></label>
    <label><span>Небольшая заметка</span><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Почему это важно?" maxLength={180} rows={3} /></label>
    <div className="form-row">
      <label><span>Раздел</span><select value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label><span>Дата</span><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
    </div>
    <button className="pixel-button" type="submit">Сохранить достижение</button>
  </form>;
}

function AchievementCard({ item, onDelete }: { item: Achievement; onDelete: (id: string) => void }) {
  return <article className="achievement-card">
    <div className={`rune rune-${item.category.toLowerCase()}`} aria-hidden="true">{categoryIcon(item.category)}</div>
    <div className="achievement-copy">
      <div className="achievement-topline"><span className="category">{item.category}</span><time dateTime={item.date}>{formatDate(item.date)}</time></div>
      <h3>{item.title}</h3>{item.note && <p>{item.note}</p>}
    </div>
    <button className="delete-button" onClick={() => onDelete(item.id)} aria-label={`Удалить «${item.title}»`} title="Удалить">×</button>
  </article>;
}

export default function Home() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); setAchievements(saved ? JSON.parse(saved) : starterAchievements); }
    catch { setAchievements(starterAchievements); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements)); }, [achievements, ready]);

  const sorted = useMemo(() => [...achievements].sort((a, b) => b.date.localeCompare(a.date)), [achievements]);

  return <main className="site-shell">
    <div className="stars" aria-hidden="true" />
    <header className="hero">
      <div className="hero-copy"><p className="eyebrow">Личный журнал Надежды Федотовой</p><h1>Мои достижения</h1><p className="subtitle">Каждый маленький шаг — часть большого приключения.</p></div>
      <div className="hero-trophy"><PixelChest /><span>{achievements.length}</span><small>сокровищ найдено</small></div>
    </header>
    <section className="content-grid">
      <AddAchievementForm onAdd={item => setAchievements(current => [item, ...current])} />
      <section className="journal pixel-panel" aria-labelledby="journal-title">
        <div className="panel-title journal-heading"><span className="tiny-spark">★</span><h2 id="journal-title">Книга побед</h2><span className="count-badge">{achievements.length}</span></div>
        {!ready ? <p className="empty-state">Открываем книгу…</p> : sorted.length ? <div className="achievement-list">{sorted.map(item => <AchievementCard key={item.id} item={item} onDelete={id => setAchievements(current => current.filter(entry => entry.id !== id))} />)}</div> : <div className="empty-state"><span aria-hidden="true">✦</span><p>Здесь появится первая победа.</p></div>}
      </section>
    </section>
    <footer>Сделано с теплом для Надежды</footer>
  </main>;
}
