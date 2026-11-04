"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  createAchievement,
  deleteAchievementRemote,
  importAchievements,
  loadAchievements,
} from "../src/api";
import type { Achievement, Category } from "../src/api";

const STORAGE_KEY = "nadezhda-achievements-v1";
const SESSION_KEY = "nadezhda-achievements-password";
const categories: Category[] = ["Личное", "Учёба", "Работа", "Здоровье"];

function PixelHeroAnimation({ celebrating }: { celebrating: boolean }) {
  const firstFrame = celebrating
    ? "./assets/nadezhda-celebrate-1.bmp"
    : "./assets/nadezhda-1.bmp";
  const secondFrame = celebrating
    ? "./assets/nadezhda-celebrate-2.bmp"
    : "./assets/nadezhda-2.bmp";

  return (
    <span
      className={`pixel-hero-animation${celebrating ? " is-celebrating" : ""}`}
      role="img"
      aria-label={
        celebrating ? "Пиксельная Надежда празднует" : "Пиксельная Надежда"
      }
    >
      <img className="pixel-frame pixel-frame-one" src={firstFrame} alt="" />
      <img className="pixel-frame pixel-frame-two" src={secondFrame} alt="" />
    </span>
  );
}

function PixelIcon({ kind }: { kind: "book" | "briefcase" | "calendar" }) {
  return (
    <svg
      className="pixel-icon"
      viewBox="0 0 16 16"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {kind === "book" && (
        <>
          <rect x="1" y="3" width="6" height="2" fill="currentColor" />
          <rect x="1" y="3" width="2" height="10" fill="currentColor" />
          <rect x="1" y="11" width="6" height="2" fill="currentColor" />
          <rect x="9" y="3" width="6" height="2" fill="currentColor" />
          <rect x="13" y="3" width="2" height="10" fill="currentColor" />
          <rect x="9" y="11" width="6" height="2" fill="currentColor" />
          <rect x="7" y="2" width="2" height="12" fill="currentColor" />
          <rect x="4" y="6" width="2" height="1" fill="currentColor" />
          <rect x="10" y="6" width="2" height="1" fill="currentColor" />
        </>
      )}
      {kind === "briefcase" && (
        <>
          <rect x="5" y="2" width="6" height="2" fill="currentColor" />
          <rect x="4" y="3" width="2" height="3" fill="currentColor" />
          <rect x="10" y="3" width="2" height="3" fill="currentColor" />
          <rect x="1" y="5" width="14" height="2" fill="currentColor" />
          <rect x="1" y="5" width="2" height="9" fill="currentColor" />
          <rect x="13" y="5" width="2" height="9" fill="currentColor" />
          <rect x="1" y="12" width="14" height="2" fill="currentColor" />
          <rect x="2" y="8" width="5" height="2" fill="currentColor" />
          <rect x="9" y="8" width="5" height="2" fill="currentColor" />
          <rect x="7" y="8" width="2" height="4" fill="currentColor" />
        </>
      )}
      {kind === "calendar" && (
        <>
          <rect x="2" y="3" width="12" height="2" fill="currentColor" />
          <rect x="2" y="3" width="2" height="11" fill="currentColor" />
          <rect x="12" y="3" width="2" height="11" fill="currentColor" />
          <rect x="2" y="12" width="12" height="2" fill="currentColor" />
          <rect x="4" y="1" width="2" height="5" fill="currentColor" />
          <rect x="10" y="1" width="2" height="5" fill="currentColor" />
          <rect x="3" y="6" width="10" height="2" fill="currentColor" />
          <rect x="5" y="9" width="2" height="2" fill="currentColor" />
          <rect x="9" y="9" width="2" height="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function categoryIcon(category: Category) {
  if (category === "Учёба") return <PixelIcon kind="book" />;
  if (category === "Работа") return <PixelIcon kind="briefcase" />;
  return category === "Личное" ? "★" : "+";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function useFloatingPanel(
  open: boolean,
  trigger: React.RefObject<HTMLButtonElement | null>,
  popup: React.RefObject<HTMLDivElement | null>,
  width: "trigger" | "calendar",
  align: "left" | "right",
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const triggerElement = trigger.current;
      if (!triggerElement) return;
      const rect = triggerElement.getBoundingClientRect();
      const panelWidth =
        width === "calendar"
          ? Math.min(286, window.innerWidth - 24)
          : Math.max(rect.width, 180);
      const panelHeight = popup.current?.offsetHeight ?? 0;
      let left = align === "right" ? rect.right - panelWidth : rect.left;
      left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));
      let top = rect.bottom + 5;
      if (panelHeight && top + panelHeight > window.innerHeight - 12) {
        const above = rect.top - panelHeight - 5;
        top = above >= 12 ? above : Math.max(12, window.innerHeight - panelHeight - 12);
      }
      setStyle({
        position: "fixed",
        zIndex: 1000,
        top,
        left,
        width: panelWidth,
        visibility: "visible",
      });
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, open, popup, trigger, width]);

  return style;
}

function CategorySelect({
  value,
  onChange,
}: {
  value: Category;
  onChange: (value: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const popupStyle = useFloatingPanel(open, trigger, popup, "trigger", "left");

  useEffect(() => {
    function close(event: PointerEvent) {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !popup.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className={`custom-field${open ? " is-open" : ""}`} ref={root}>
      <span className="field-label">Раздел</span>
      <button
        ref={trigger}
        className="custom-control select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span className="control-icon">{categoryIcon(value)}</span>
        <span>{value}</span>
        <span className="chevron" aria-hidden="true">
          ▼
        </span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popup}
          className="dropdown-menu category-menu"
          role="listbox"
          aria-label="Раздел достижения"
          style={popupStyle}
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={item === value}
              className={item === value ? "selected" : ""}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              <span>{categoryIcon(item)}</span>
              {item}
              {item === value && <span className="option-check">✓</span>}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function PixelDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Date(`${value}T12:00:00`);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const popupStyle = useFloatingPanel(open, trigger, popup, "calendar", "right");
  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthTitle = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(view);
  const week = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  useEffect(() => {
    function close(event: PointerEvent) {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !popup.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function isoDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div
      className={`custom-field date-picker${open ? " is-open" : ""}`}
      ref={root}
    >
      <span className="field-label">Дата</span>
      <button
        ref={trigger}
        className="custom-control date-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span className="control-icon">
          <PixelIcon kind="calendar" />
        </span>
        <span>{formatDate(value)}</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popup}
          className="dropdown-menu calendar-popover"
          role="dialog"
          aria-label="Выбор даты"
          style={popupStyle}
        >
          <div className="calendar-header">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() => setView(new Date(year, month - 1, 1))}
            >
              ◀
            </button>
            <strong>{monthTitle}</strong>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() => setView(new Date(year, month + 1, 1))}
            >
              ▶
            </button>
          </div>
          <div className="calendar-grid calendar-week">
            {week.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: leadingDays }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
              (day) => {
                const dayValue = isoDate(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={dayValue === value ? "selected-day" : ""}
                    aria-label={formatDate(dayValue)}
                    aria-pressed={dayValue === value}
                    onClick={() => {
                      onChange(dayValue);
                      setOpen(false);
                    }}
                  >
                    {day}
                  </button>
                );
              },
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function AddAchievementForm({
  onAdd,
}: {
  onAdd: (item: Achievement) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<Category>("Личное");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Сначала назови своё достижение!");
      titleInput.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: cleanTitle,
        note: note.trim(),
        category,
        date,
      });
      setTitle("");
      setNote("");
      setError("");
    } catch {
      setError("Не удалось сохранить. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="quest-form pixel-panel" onSubmit={submit}>
      <div className="panel-title">
        <span className="tiny-spark">+</span>
        <h2>Новое достижение</h2>
      </div>
      <label>
        <span>Что получилось?</span>
        <input
          ref={titleInput}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError("");
          }}
          placeholder="пример: раздуплилась"
          maxLength={80}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "title-error" : undefined}
        />
      </label>
      {error && (
        <div className="form-error" id="title-error" role="alert">
          <span aria-hidden="true">!</span>
          <p>{error}</p>
        </div>
      )}
      <label>
        <span>Небольшая заметка</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="..."
          maxLength={180}
          rows={3}
        />
      </label>
      <div className="form-row">
        <CategorySelect value={category} onChange={setCategory} />
        <PixelDatePicker value={date} onChange={setDate} />
      </div>
      <button className="pixel-button" type="submit" disabled={saving}>
        {saving ? "Сохраняем…" : "Сохранить достижение"}
      </button>
    </form>
  );
}

function AchievementCard({
  item,
  onDelete,
}: {
  item: Achievement;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="achievement-card">
      <div
        className={`rune rune-${item.category.toLowerCase()}`}
        aria-hidden="true"
      >
        {categoryIcon(item.category)}
      </div>
      <div className="achievement-copy">
        <div className="achievement-topline">
          <span className="category">{item.category}</span>
          <time dateTime={item.date}>{formatDate(item.date)}</time>
        </div>
        <h3>{item.title}</h3>
        {item.note && <p>{item.note}</p>}
      </div>
      <button
        className="delete-button"
        onClick={() => onDelete(item.id)}
        aria-label={`Удалить «${item.title}»`}
        title="Удалить"
      >
        ×
      </button>
    </article>
  );
}

function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (password: string) => Promise<void>;
  error: string;
}) {
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) return;
    setSubmitting(true);
    await onLogin(password);
    setSubmitting(false);
  }

  return (
    <main className="site-shell auth-page">
      <div className="stars" aria-hidden="true" />
      <form className="auth-card pixel-panel" onSubmit={submit}>
        <div className="panel-title">
          <span className="tiny-spark">◆</span>
          <h1>Вход</h1>
        </div>
        <p>Введите один из неологизмов Надежды.</p>
        <label>
          <span>Пароле пароле пароле</span>
          <span className="password-field">
            <input
              className={passwordVisible ? "" : "is-masked"}
              type="text"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoCapitalize="none"
              inputMode="text"
              lang="ru"
              spellCheck={false}
              autoFocus
            />
            {!passwordVisible && password && (
              <span className="password-mask" aria-hidden="true">
                {Array.from(password, () => "•").join("")}
              </span>
            )}
            <button
              className="password-toggle"
              type="button"
              aria-pressed={passwordVisible}
              aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? "Скрыть" : "Показать"}
            </button>
          </span>
        </label>
        {error && (
          <div className="form-error" role="alert">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}
        <button
          className="pixel-button"
          type="submit"
          disabled={submitting || !password}
        >
          {submitting ? "хммм..." : "ЛЕТ МИ ИННН"}
        </button>
      </form>
    </main>
  );
}

export default function Home() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [authState, setAuthState] = useState<"checking" | "locked" | "ready">(
    "checking",
  );
  const [authError, setAuthError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationRun, setCelebrationRun] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [countBuilding, setCountBuilding] = useState(false);
  const [celebrationOrigin, setCelebrationOrigin] = useState({ x: 0, y: 0 });
  const celebrationTimer = useRef<number | undefined>(undefined);
  const countUpdateTimer = useRef<number | undefined>(undefined);
  const countTarget = useRef(0);
  const heroTrophy = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedPassword = sessionStorage.getItem(SESSION_KEY);
    if (savedPassword) void authenticate(savedPassword);
    else setAuthState("locked");
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(celebrationTimer.current);
      window.clearTimeout(countUpdateTimer.current);
    },
    [],
  );

  async function authenticate(candidate: string) {
    setAuthState("checking");
    setAuthError("");
    try {
      let remoteAchievements = await loadAchievements(candidate);
      if (remoteAchievements.length === 0) {
        let legacyAchievements: Achievement[] = [];
        try {
          const legacy = localStorage.getItem(STORAGE_KEY);
          legacyAchievements = legacy ? JSON.parse(legacy) : [];
        } catch {
          legacyAchievements = [];
        }
        if (legacyAchievements.length) {
          await importAchievements(candidate, legacyAchievements);
          remoteAchievements = await loadAchievements(candidate);
        }
      }
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem(SESSION_KEY, candidate);
      setPassword(candidate);
      setAchievements(remoteAchievements);
      countTarget.current = remoteAchievements.length;
      setDisplayedCount(remoteAchievements.length);
      setReady(true);
      setAuthState("ready");
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      setReady(false);
      setAuthState("locked");
      setAuthError(
        error instanceof ApiError && error.status === 401
          ? "Непосвещённый... брысь!"
          : "Что-то где-то проебалось. Возможно кто-то уже вошёл в систему. Попробуй ещё раз.",
      );
    }
  }

  async function addAchievement(item: Achievement) {
    setSyncError("");
    await createAchievement(password, item);
    const spriteBounds = heroTrophy.current
      ?.querySelector(".pixel-hero-animation")
      ?.getBoundingClientRect();
    if (spriteBounds) {
      setCelebrationOrigin({
        x: spriteBounds.left + spriteBounds.width / 2,
        y: spriteBounds.top + spriteBounds.height / 2,
      });
    }
    setAchievements((current) => [item, ...current]);
    countTarget.current += 1;
    setCelebrating(true);
    setCountBuilding(true);
    setCelebrationRun((current) => current + 1);
    window.clearTimeout(celebrationTimer.current);
    window.clearTimeout(countUpdateTimer.current);
    countUpdateTimer.current = window.setTimeout(() => {
      setDisplayedCount(countTarget.current);
      setCountBuilding(false);
    }, 550);
    const celebrationDuration = window.matchMedia("(max-width: 460px)").matches
      ? 2350
      : 1350;
    celebrationTimer.current = window.setTimeout(
      () => setCelebrating(false),
      celebrationDuration,
    );
  }

  async function deleteAchievement(id: string) {
    setSyncError("");
    try {
      await deleteAchievementRemote(password, id);
      setAchievements((current) => current.filter((entry) => entry.id !== id));
      countTarget.current = Math.max(0, countTarget.current - 1);
      window.clearTimeout(countUpdateTimer.current);
      setCountBuilding(false);
      setDisplayedCount(countTarget.current);
    } catch {
      setSyncError("Не удалось удалить запись. Попробуй ещё раз.");
    }
  }

  const sorted = useMemo(
    () => [...achievements].sort((a, b) => b.date.localeCompare(a.date)),
    [achievements],
  );

  const mobileCelebrationPosition = {
    "--origin-x": `${celebrationOrigin.x}px`,
    "--origin-y": `${celebrationOrigin.y}px`,
  } as CSSProperties;

  if (authState !== "ready") {
    return <LoginScreen onLogin={authenticate} error={authError} />;
  }

  return (
    <main className={`site-shell${celebrating ? " is-celebrating" : ""}`}>
      <div className="stars" aria-hidden="true" />
      {celebrating && (
        <>
          <div className="mobile-celebration-dim" aria-hidden="true" />
          <div
            className="mobile-celebration"
            style={mobileCelebrationPosition}
            aria-hidden="true"
          >
            <PixelHeroAnimation celebrating />
            <span className="mobile-score">
              <span
                key={`mobile-count-${celebrationRun}`}
                className={`hero-count${countBuilding ? " is-building" : ""}`}
              >
                {displayedCount}
              </span>
            </span>
          </div>
        </>
      )}
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Великие</p>
          <h1>Достижения</h1>
          <p className="subtitle">Надежды Федотовой, которая могёт</p>
        </div>
        <div className="hero-trophy" ref={heroTrophy}>
          <PixelHeroAnimation key={celebrationRun} celebrating={celebrating} />
          <span
            key={`count-${celebrationRun}`}
            className={`hero-count${countBuilding ? " is-building" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {displayedCount}
          </span>
        </div>
      </header>
      <section className="content-grid">
        <AddAchievementForm onAdd={addAchievement} />
        <section
          className="journal pixel-panel"
          aria-labelledby="journal-title"
        >
          <div className="panel-title journal-heading">
            <span className="tiny-spark">★</span>
            <h2 id="journal-title">Список ачивок</h2>
            <span className="count-badge">{achievements.length}</span>
          </div>
          {syncError && (
            <div className="sync-error" role="alert">
              {syncError}
            </div>
          )}
          {!ready ? (
            <p className="empty-state">Открываем книгу…</p>
          ) : sorted.length ? (
            <div className="achievement-list">
              {sorted.map((item) => (
                <AchievementCard
                  key={item.id}
                  item={item}
                  onDelete={deleteAchievement}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✦</span>
              <p>Здесь появится первая победа.</p>
            </div>
          )}
        </section>
      </section>
      <footer>С ДР, Надежданчик &lsaquo;3</footer>
    </main>
  );
}
