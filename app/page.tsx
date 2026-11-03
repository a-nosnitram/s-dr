"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function CategorySelect({ value, onChange }: { value: Category; onChange: (value: Category) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div className="custom-field" ref={root}>
    <span className="field-label">Раздел</span>
    <button className="custom-control select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
      <span className="control-icon">{categoryIcon(value)}</span><span>{value}</span><span className="chevron" aria-hidden="true">▼</span>
    </button>
    {open && <div className="dropdown-menu category-menu" role="listbox" aria-label="Раздел достижения">
      {categories.map(item => <button key={item} type="button" role="option" aria-selected={item === value} className={item === value ? "selected" : ""} onClick={() => { onChange(item); setOpen(false); }}>
        <span>{categoryIcon(item)}</span>{item}{item === value && <span className="option-check">✓</span>}
      </button>)}
    </div>}
  </div>;
}

function PixelDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = new Date(`${value}T12:00:00`);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const root = useRef<HTMLDivElement>(null);
  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(view);
  const week = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function isoDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return <div className="custom-field date-picker" ref={root}>
    <span className="field-label">Дата</span>
    <button className="custom-control date-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
      <span className="control-icon">◆</span><span>{formatDate(value)}</span>
    </button>
    {open && <div className="dropdown-menu calendar-popover" role="dialog" aria-label="Выбор даты">
      <div className="calendar-header">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => setView(new Date(year, month - 1, 1))}>◀</button>
        <strong>{monthTitle}</strong>
        <button type="button" aria-label="Следующий месяц" onClick={() => setView(new Date(year, month + 1, 1))}>▶</button>
      </div>
      <div className="calendar-grid calendar-week">{week.map(day => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => {
          const dayValue = isoDate(day);
          return <button key={day} type="button" className={dayValue === value ? "selected-day" : ""} aria-label={formatDate(dayValue)} aria-pressed={dayValue === value} onClick={() => { onChange(dayValue); setOpen(false); }}>{day}</button>;
        })}
      </div>
    </div>}
  </div>;
}

function AddAchievementForm({ onAdd }: { onAdd: (item: Achievement) => void }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<Category>("Личное");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Сначала назови своё достижение!");
      titleInput.current?.focus();
      return;
    }
    onAdd({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: cleanTitle, note: note.trim(), category, date });
    setTitle(""); setNote(""); setError("");
  }

  return <form className="quest-form pixel-panel" onSubmit={submit}>
    <div className="panel-title"><span className="tiny-spark">+</span><h2>Новое достижение</h2></div>
    <label><span>Что получилось?</span><input ref={titleInput} value={title} onChange={e => { setTitle(e.target.value); if (error) setError(""); }} placeholder="Например: закончила важный проект" maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? "title-error" : undefined} /></label>
    {error && <div className="form-error" id="title-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}
    <label><span>Небольшая заметка</span><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Почему это важно?" maxLength={180} rows={3} /></label>
    <div className="form-row">
      <CategorySelect value={category} onChange={setCategory} />
      <PixelDatePicker value={date} onChange={setDate} />
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
