"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACHIEVEMENTS,
  AI_PROJECTS,
  AREAS,
  CERTIFICATIONS,
  CONTROLS,
  EXPERIENCE,
  NAV_ITEMS,
  PROFILE,
  PROJECTS,
  REWARDS,
  SKILL_GROUPS,
  WHISPER_FLAGS,
  flagUrl,
  ui,
  type AchievementId,
  type AreaId,
  type NavItem,
  type SectionId,
} from "./data";
import type { BrunoWorld, TickState } from "./engine/world";
import { Soundscape } from "./audio";
import ProjectShowcase from "./ProjectShowcase";

const EMPTY_PROGRESS: Record<AchievementId, number> = {
  adventure: 0,
  developer: 0,
  aiExplorer: 0,
  traveler: 0,
  wifi: 0,
  speed: 0,
  speedDemon: 0,
  secret: 0,
  whisperer: 0,
};

const STORAGE_KEY = "bruno-simon-clone-v1";

const ABOUT_ITEM: NavItem = {
  id: "behindTheScene",
  label: "About",
  icon: "question.svg",
  preview: "behindTheScene.webp",
};

const MENU_PREVIEWS: NavItem[] = [...NAV_ITEMS, ABOUT_ITEM];

interface Toast {
  id: number;
  title: string;
  text?: string;
  variant?: "info" | "song" | "area";
}

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};

const areaById = (id: AreaId | null) => AREAS.find((area) => area.id === id) ?? null;

export default function BrunoSite() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<BrunoWorld | null>(null);
  const soundRef = useRef<Soundscape | null>(null);
  const menuRef = useRef<SectionId | null>(null);
  const promptRef = useRef<AreaId | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<"loading" | "intro" | "playing" | "error">("loading");
  const [loadProgress, setLoadProgress] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);
  const [menu, setMenu] = useState<SectionId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [prompt, setPrompt] = useState<AreaId | null>(null);
  const [tick, setTick] = useState<TickState>({
    x: 0,
    z: 24,
    heading: Math.PI,
    speed: 0,
    kmh: 0,
    area: null,
    racing: false,
    lapMs: 0,
    odometer: 0,
  });
  const [progress, setProgress] = useState<Record<AchievementId, number>>(EMPTY_PROGRESS);
  const [completed, setCompleted] = useState<AchievementId[]>([]);
  const [notifications, setNotifications] = useState<Toast[]>([]);
  const [tab, setTab] = useState("mouse-keyboard");
  const [message, setMessage] = useState("");
  const [flag, setFlag] = useState("fr");
  const [flagOpen, setFlagOpen] = useState(false);
  const [bestLap, setBestLap] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [touchDevice, setTouchDevice] = useState(false);
  const [showTouchHint, setShowTouchHint] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [labProjectId, setLabProjectId] = useState<string | null>(null);

  const progressRef = useRef(progress);
  const completedRef = useRef<Set<AchievementId>>(new Set());
  const visitedRef = useRef<Set<AreaId>>(new Set());
  const lastTickRef = useRef(0);
  const mutedRef = useRef(false);
  const qualityRef = useRef<"high" | "low">("high");
  const startedRef = useRef(false);

  const notify = useCallback((title: string, text?: string, variant?: Toast["variant"]) => {
    const id = Date.now() + Math.random();
    setNotifications((list) => [...list, { id, title, text, variant }]);
    window.setTimeout(() => {
      setNotifications((list) => list.filter((item) => item.id !== id));
    }, 4600);
  }, []);

  const grant = useCallback(
    (id: AchievementId, amount = 1) => {
      const definition = ACHIEVEMENTS.find((item) => item.id === id);
      if (!definition) return;
      const current = progressRef.current[id] ?? 0;
      const next = Math.min(definition.target, current + amount);
      if (next === current) return;

      const nextProgress = { ...progressRef.current, [id]: next };
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (next >= definition.target && !completedRef.current.has(id)) {
        completedRef.current.add(id);
        setCompleted((list) => (list.includes(id) ? list : [...list, id]));
        notify(definition.title, definition.description);
      }
    },
    [notify],
  );

  const grantRef = useRef(grant);
  grantRef.current = grant;
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const openMenu = useCallback((section: SectionId) => {
    menuRef.current = section;
    setMenu(section);
    setMapOpen(false);
    setFlagOpen(false);
    if (section !== "projects") setProjectId(null);
    if (section !== "lab") setLabProjectId(null);
    worldRef.current?.setPaused(true);
  }, []);

  const closeMenu = useCallback(() => {
    menuRef.current = null;
    setMenu(null);
    setFlagOpen(false);
    setProjectId(null);
    setLabProjectId(null);
    if (!mapOpen) worldRef.current?.setPaused(false);
  }, [mapOpen]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    soundRef.current?.setMuted(next);
  }, []);

  /* -------------------------------------------------------------- */
  /* Boot                                                            */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sound = new Soundscape();
    soundRef.current = sound;
    let cancelled = false;
    let world: BrunoWorld | null = null;

    const boot = async () => {
      await document.fonts.ready.catch(() => undefined);
      const { BrunoWorld: WorldClass } = await import("./engine/world");
      if (cancelled) return;
      const cores = navigator.hardwareConcurrency ?? 8;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const initialQuality: "high" | "low" = cores <= 4 || reducedMotion ? "low" : "high";
      qualityRef.current = initialQuality;
      setQuality(initialQuality);
      world = new WorldClass(canvas, {
        onTick: (state) => {
          sound.update(state.kmh);
          const now = performance.now();
          if (now - lastTickRef.current < 220) return;
          lastTickRef.current = now;
          setTick(state);
          if (
            startedRef.current &&
            !completedRef.current.has("adventure") &&
            Math.hypot(state.x, state.z - 24) > 20
          ) {
            grantRef.current("adventure");
          }
        },
        onAreaChange: (area) => {
          promptRef.current = area;
          setPrompt(area);
          if (!area) return;
          if (!visitedRef.current.has(area)) {
            visitedRef.current.add(area);
            grantRef.current("traveler");
            const definition = AREAS.find((item) => item.id === area);
            if (area === "lab") {
              grantRef.current("aiExplorer");
              notifyRef.current(
                "AI Lab discovered",
                "Press ENTER or tap the prompt to inspect the AI project terminals.",
                "area",
              );
            } else if (area === "options") {
              grantRef.current("developer");
              notifyRef.current("Workshop discovered", "Skills, experience and certifications are inside.", "area");
            } else if (area === "projects") {
              notifyRef.current("Projects discovered", "Open the menu to browse every build.", "area");
            } else if (definition) {
              notifyRef.current(`${definition.label} discovered`, "Press ENTER to open this area.", "area");
            }
          }
        },
        onProject: () => grantRef.current("wifi"),
        onAchievement: (id) => grantRef.current(id),
        onLap: (ms) => {
          setBestLap((current) => (current === null ? ms : Math.min(current, ms)));
          grantRef.current("speedDemon");
          notifyRef.current("Lap complete", `Your time — ${formatTime(ms)}`);
        },
        onLoadProgress: (progress) => setLoadProgress(progress),
        onReady: () => setPhase("intro"),
      });
      world.setQuality(initialQuality);
      worldRef.current = world;
    };
    boot().catch((error: unknown) => {
      if (cancelled) return;
      console.error("Failed to initialize the portfolio experience:", error);
      setBootError("The 3D experience could not be initialized.");
      setPhase("error");
    });

    return () => {
      cancelled = true;
      world?.dispose();
      worldRef.current = null;
      sound.dispose();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    setTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  /* -------------------------------------------------------------- */
  /* Persistence                                                     */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as {
        progress?: Partial<Record<AchievementId, number>>;
        completed?: AchievementId[];
        visited?: AreaId[];
        bestLap?: number | null;
      };
      const merged = { ...EMPTY_PROGRESS, ...(stored.progress ?? {}) };
      progressRef.current = merged;
      setProgress(merged);
      if (stored.completed) {
        const valid = stored.completed.filter((id) => {
          const definition = ACHIEVEMENTS.find((item) => item.id === id);
          return definition ? (merged[id] ?? 0) >= definition.target : false;
        });
        completedRef.current = new Set(valid);
        setCompleted(valid);
      }
      if (stored.visited) visitedRef.current = new Set(stored.visited);
      if (typeof stored.bestLap === "number") setBestLap(stored.bestLap);
    } catch {
      // Corrupt storage is not fatal.
    }
  }, []);

  useEffect(() => {
    if (phase === "loading") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          progress,
          completed: Array.from(completedRef.current),
          visited: Array.from(visitedRef.current),
          bestLap,
        }),
      );
    } catch {
      // Storage may be unavailable in private mode.
    }
  }, [progress, bestLap, phase]);

  /* -------------------------------------------------------------- */
  /* Keyboard shortcuts                                              */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const key = event.key.toLowerCase();

      if (key === "escape") {
        if (mapOpen) {
          setMapOpen(false);
          worldRef.current?.setPaused(false);
        } else if (menuRef.current === "projects" && projectId) {
          setProjectId(null);
        } else if (menuRef.current === "lab" && labProjectId) {
          setLabProjectId(null);
        } else if (menuRef.current) {
          closeMenu();
        } else if (phase === "playing") {
          openMenu("home");
        }
        return;
      }

      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (phase !== "playing") return;
      if (menuRef.current || mapOpen) return;

      if (key === "m") {
        setMapOpen((open) => {
          const next = !open;
          worldRef.current?.setPaused(next || menuRef.current !== null);
          return next;
        });
      }
      if (key === "l") toggleMute();
      if (key === "r") {
        worldRef.current?.respawn();
        notify("Respawned", "Back to the landing area.");
      }
      if (key === "h") soundRef.current?.honk();
      if (key === "t") openMenu("whispers");
      if (key === "enter" && promptRef.current) {
        const area = areaById(promptRef.current);
        if (area?.section) openMenu(area.section);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, mapOpen, closeMenu, openMenu, toggleMute, notify, projectId, labProjectId]);

  /* -------------------------------------------------------------- */
  /* Dialog focus management                                         */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!menu && !mapOpen) return;
    const container = menu ? dialogRef.current : mapRef.current;
    if (!container) return;

    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => element.getAttribute("aria-disabled") !== "true" && element.offsetParent !== null,
      );

    const focusTimer = window.setTimeout(() => {
      getFocusable()[0]?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, mapOpen]);

  /* -------------------------------------------------------------- */
  /* Actions                                                         */
  /* -------------------------------------------------------------- */

  const handleStart = () => {
    if (phase !== "intro") return;
    startedRef.current = true;
    soundRef.current?.start();
    setFlash(true);
    window.setTimeout(() => {
      worldRef.current?.startExperience();
      setPhase("playing");
      setFlash(false);
      if (touchDevice) {
        setShowTouchHint(true);
        window.setTimeout(() => setShowTouchHint(false), 7000);
      }
      notify("Now playing", "Baguira — Kounine", "song");
    }, 260);
  };

  const openMap = () => {
    setMapOpen(true);
    setMenu(null);
    menuRef.current = null;
    worldRef.current?.setPaused(true);
  };

  const closeMap = () => {
    setMapOpen(false);
    worldRef.current?.setPaused(menuRef.current !== null);
  };

  const toggleQuality = () => {
    const next = qualityRef.current === "high" ? "low" : "high";
    qualityRef.current = next;
    setQuality(next);
    worldRef.current?.setQuality(next);
  };

  const resetWorld = () => {
    worldRef.current?.resetWorld();
    notify("World reset", "Every object is back in place.", "info");
  };

  const resetAchievements = () => {
    progressRef.current = { ...EMPTY_PROGRESS };
    visitedRef.current = new Set();
    completedRef.current = new Set();
    setProgress({ ...EMPTY_PROGRESS });
    setCompleted([]);
    worldRef.current?.resetWorld();
    notify("Achievements reset", "Fresh start.", "info");
  };

  const submitWhisper = (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim().slice(0, 30);
    if (!text) return;
    worldRef.current?.addWhisper(text, flag);
    setMessage("");
    grant("whisperer");
    notify("Whisper posted", text, "info");
  };

  const startRace = () => {
    worldRef.current?.restartRace();
    closeMenu();
    notify("Circuit restarted", "Cross the line to set a time.", "info");
  };

  const endRace = () => {
    worldRef.current?.endRace();
    closeMenu();
    notify("Circuit ended", "Your run has been stopped.", "info");
  };

  const teleport = (id: AreaId) => {
    closeMap();
    worldRef.current?.teleportTo(id);
  };

  const scrollToContact = () => {
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    document.getElementById("bs-contact")?.scrollIntoView({ behavior, block: "start" });
  };

  /* -------------------------------------------------------------- */
  /* Render                                                          */
  /* -------------------------------------------------------------- */

  const activeItem = NAV_ITEMS.find((item) => item.id === menu) ?? (menu === "behindTheScene" ? ABOUT_ITEM : null);
  const promptArea = areaById(prompt);
  const activeArea = tick.area ? areaById(tick.area) : null;
  const doneCount = completed.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const whisperPreview = message.trim() ? message.trim().slice(0, 30) : "Your message here";

  return (
    <div className={`bs-root ${muted ? "is-muted" : ""}`}>
      <canvas ref={canvasRef} className="bs-canvas" />

      {phase === "loading" && (
        <div className="bs-loading" role="status" aria-live="polite" aria-label="Loading the island">
          <span className="bs-loading__name">MOHAMED FAAZIL</span>
          <span className="bs-loading__role">AI &amp; Full Stack Developer</span>
          <span className="bs-loading__label">Loading the island</span>
          <div
            className="bs-loading__bar"
            role="progressbar"
            aria-label="Island loading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(loadProgress * 100)}
          >
            <span style={{ width: `${Math.round(loadProgress * 100)}%`, animation: "none" }} />
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="bs-error" role="alert">
          <div className="bs-error__eyebrow">PORTFOLIO UNAVAILABLE</div>
          <h1 className="bs-error__title">Unable to start the island</h1>
          <p className="bs-error__text">
            {bootError ?? "The 3D experience could not be initialized."} Try reloading the page.
          </p>
          <button type="button" className="bs-button bs-button--green" onClick={() => window.location.reload()}>
            Reload experience
          </button>
        </div>
      )}

      {phase === "intro" && (
        <div
          className="bs-intro"
          onClick={handleStart}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleStart();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Start the 3D portfolio experience"
        >
          <div className="bs-intro__identity">
            <span className="bs-intro__eyebrow">INTERACTIVE PORTFOLIO</span>
            <strong>MOHAMED FAAZIL</strong>
            <span className="bs-intro__role">AI &amp; Full Stack Developer</span>
            <span className="bs-intro__tagline">Building intelligent applications and interactive digital experiences.</span>
          </div>
          <div className="bs-intro__hint">
            <svg className="bs-intro__arrow" viewBox="0 0 60 34" fill="none" aria-hidden="true">
              <path d="M2 20c14 8 32 9 50 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M44 13l9 8-11 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {touchDevice ? "Tap" : "Click"} to
            <br />
            start
            <small>{touchDevice ? "drag to drive · tap the prompt to explore" : "drive with WASD or arrows"}</small>
          </div>
          <button
            type="button"
            className="bs-intro__sound"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            onClick={(event) => {
              event.stopPropagation();
              toggleMute();
            }}
          >
            <img src={ui(muted ? "audio/audioOff.svg" : "audio/audioOn.svg")} alt="" />
          </button>
        </div>
      )}

      {phase === "playing" && !menu && !mapOpen && (
        <>
          <button type="button" className="bs-trigger bs-trigger--menu" onClick={() => openMenu("home")} aria-label="Open portfolio menu">
            <span className="bs-trigger__inner">
              <span className="bs-trigger__icon">
                <span className="bs-burger">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            </span>
          </button>
          <button type="button" className="bs-trigger bs-trigger--map" onClick={openMap} aria-label="Open island map">
            <span className="bs-trigger__inner">
              <span className="bs-trigger__icon">
                <img src={ui("map.svg")} alt="" />
              </span>
            </span>
          </button>
        </>
      )}

      {phase === "playing" && activeArea && !menu && !mapOpen && (
        <div className="bs-area-tag" aria-live="polite">
          <span className="bs-area-tag__dot" />
          {activeArea.label}
        </div>
      )}

      {phase === "playing" && promptArea && !menu && !mapOpen && (
        <button
          type="button"
          className="bs-prompt"
          onClick={() => openMenu(promptArea.section)}
          aria-label={`Open ${promptArea.label}`}
        >
          <kbd>{touchDevice ? "TAP" : "ENTER"}</kbd> {promptArea.label}
        </button>
      )}

      {phase === "playing" && tick.racing && !menu && !mapOpen && (
        <div className="bs-race-hud">
          <div className="bs-race-hud__label">Circuit</div>
          <div className="bs-race-hud__time">{formatTime(tick.lapMs)}</div>
        </div>
      )}

      {showTouchHint && <div className="bs-touch-hint">Drag the left side to drive, right side to look</div>}

      {menu && activeItem && (
        <div className="bs-menu" role="dialog" aria-modal="true" aria-label={`${activeItem.label} menu`}>
          <div className="bs-menu__backdrop" aria-hidden="true" />
          <div className="bs-menu__inner" ref={dialogRef}>
            <div className="bs-menu__nav" role="tablist" aria-label="Portfolio areas">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`bs-menu__nav-item ${item.id === menu ? "is-active" : ""}`}
                  onClick={() => setMenu(item.id)}
                  aria-label={item.label}
                  aria-pressed={item.id === menu}
                  title={item.label}
                >
                  <span className="bs-menu__nav-inner">
                    <span className="bs-menu__nav-icon">
                      <img src={ui(item.icon)} alt="" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="bs-menu__close" onClick={closeMenu} aria-label="Close menu">
              <span className="bs-menu__close-inner">
                <span className="bs-menu__close-icon">
                  <img src={ui("close.svg")} alt="" />
                </span>
              </span>
            </button>

            <div className="bs-menu__container">
              <div className="bs-menu__previews">
                {MENU_PREVIEWS.map((item) => (
                  <div
                    key={item.id}
                    className={`bs-menu__preview ${menu === item.id ? "is-visible" : ""}`}
                    aria-hidden={menu !== item.id}
                  >
                    {item.id === "home" ? (
                      <HomePreview />
                    ) : item.id === "projects" ? (
                      <ProjectsPreview />
                    ) : item.id === "lab" ? (
                      <AiLabPreview />
                    ) : (
                      <img src={ui(`previews/${item.preview}`)} alt="" />
                    )}
                    {item.id === "whispers" && (
                      <div className="bs-whisper-preview">
                        <div className="bs-whisper-preview__message">
                          {whisperPreview}
                          <img className="bs-whisper-preview__flag" src={flagUrl(flag)} alt="" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bs-menu__internals">
                {/* Home */}
                <div className={`bs-menu__content bs-home ${menu === "home" ? "is-visible" : ""}`} inert={menu !== "home"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-home__eyebrow">Portfolio menu</div>
                    <h1 className="bs-home__name">
                      MOHAMED
                      <br />
                      FAAZIL
                    </h1>
                    <div className="bs-home__role">AI &amp; Full Stack Developer</div>
                    <p className="bs-home__tagline">
                      &ldquo;{PROFILE.tagline}&rdquo;
                    </p>

                    <div className="bs-home__actions">
                      <button
                        type="button"
                        className="bs-button bs-button--green"
                        onClick={() => setMenu("projects")}
                      >
                        Explore portfolio
                      </button>
                      <a
                        className="bs-button"
                        href="/faazil-resume.pdf"
                        download="Faazil-resume.pdf"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View resume
                      </a>
                    </div>

                    <div className="bs-home__links" aria-label="Profile links">
                      {PROFILE.links.github ? (
                        <a href={PROFILE.links.github} target="_blank" rel="noreferrer">
                          GitHub
                        </a>
                      ) : (
                        <button type="button" disabled title="GitHub profile URL not provided">
                          GitHub
                        </button>
                      )}
                      {PROFILE.links.linkedin ? (
                        <a href={PROFILE.links.linkedin} target="_blank" rel="noreferrer">
                          LinkedIn
                        </a>
                      ) : (
                        <button type="button" disabled title="LinkedIn profile URL not provided">
                          LinkedIn
                        </button>
                      )}
                      <button type="button" onClick={scrollToContact}>
                        Contact
                      </button>
                      <button type="button" onClick={() => setMenu("behindTheScene")}>
                        About this build
                      </button>
                    </div>

                    <div className="bs-home__facts">
                      <div>
                        <span>Focus</span>
                        <strong>AI · Full Stack · Interactive</strong>
                      </div>
                      <div>
                        <span>Education</span>
                        <strong>{PROFILE.education}</strong>
                      </div>
                      <div>
                        <span>Institution</span>
                        <strong>{PROFILE.institution}</strong>
                      </div>
                    </div>

                    <div className="bs-contact-card" id="bs-contact">
                      <h2 className="bs-title bs-title--sm">Contact</h2>
                      <p className="bs-text">
                        Based in <strong>{PROFILE.location}</strong>. Open to AI, data science and full-stack roles.
                      </p>
                      <div className="bs-contact-card__links">
                        <a className="bs-contact-card__link" href={`mailto:${PROFILE.email}`}>
                          <span>Email</span>
                          <strong>{PROFILE.email}</strong>
                        </a>
                        <a className="bs-contact-card__link" href={`tel:${PROFILE.phone.replace(/\s/g, "")}`}>
                          <span>Phone</span>
                          <strong>{PROFILE.phone}</strong>
                        </a>
                        {PROFILE.links.github && (
                          <a
                            className="bs-contact-card__link"
                            href={PROFILE.links.github}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>GitHub</span>
                            <strong>Faazil-zainab</strong>
                          </a>
                        )}
                        {PROFILE.links.linkedin && (
                          <a
                            className="bs-contact-card__link"
                            href={PROFILE.links.linkedin}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>LinkedIn</span>
                            <strong>Mohamed Faazil</strong>
                          </a>
                        )}
                      </div>
                      <a className="bs-button bs-button--small bs-button--green" href="/faazil-resume.pdf" target="_blank" rel="noreferrer">
                        Open resume
                      </a>
                    </div>
                  </div>
                </div>

                {/* Workshop — skills, experience and settings */}
                <div className={`bs-menu__content bs-options-content bs-workshop ${menu === "options" ? "is-visible" : ""}`} inert={menu !== "options"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">Workshop</div>
                    <p className="bs-text bs-workshop__lede">
                      The tools, stacks and experiences behind the builds. Everything here comes from the profile
                      brief.
                    </p>

                    <div className="bs-skill-groups">
                      {SKILL_GROUPS.map((group) => (
                        <section key={group.label} className="bs-skill-group">
                          <h2 className="bs-skill-group__label">{group.label}</h2>
                          <div className="bs-tags">
                            {group.items.map((item) => (
                              <span key={item} className="bs-tag">
                                {item}
                              </span>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <h2 className="bs-title bs-title--sm bs-workshop__heading">Experience</h2>
                    <div className="bs-experience-card">
                      <div className="bs-experience-card__top">
                        <div>
                          <strong>{EXPERIENCE.position}</strong>
                          <span>
                            {EXPERIENCE.company} · {EXPERIENCE.location}
                          </span>
                        </div>
                        <span className="bs-experience-card__date">{EXPERIENCE.duration}</span>
                      </div>
                      <ul className="bs-feature-list">
                        {EXPERIENCE.items.map((item) => (
                          <li key={item}>
                            <span aria-hidden="true">▸</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <h2 className="bs-title bs-title--sm bs-workshop__heading">Certifications</h2>
                    <ul className="bs-cert-list">
                      {CERTIFICATIONS.map((certification) => (
                        <li key={certification}>
                          <span className="bs-cert-list__badge" aria-hidden="true">
                            ✓
                          </span>
                          {certification}
                        </li>
                      ))}
                    </ul>

                    <h2 className="bs-title bs-title--sm bs-workshop__heading">Settings</h2>
                    <table className="bs-options-table">
                      <tbody>
                        <tr>
                          <td>Audio</td>
                          <td>
                            <button
                              type="button"
                              className={`bs-button bs-button--small bs-tooltip bs-audio-toggle ${muted ? "is-muted" : ""}`}
                              onClick={toggleMute}
                            >
                              <span className="bs-tooltip__bubble">Toggles sound</span>
                              <img className="bs-audio-on" src={ui("audio/audioOn.svg")} alt="" />
                              <img className="bs-audio-off" src={ui("audio/audioOff.svg")} alt="" />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>Quality</td>
                          <td>
                            <button type="button" className="bs-button bs-button--small bs-tooltip" onClick={toggleQuality}>
                              <span className="bs-tooltip__bubble">Toggles some effects</span>
                              <span>{quality === "high" ? "High" : "Low"}</span>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>I&apos;m stuck!</td>
                          <td>
                            <button
                              type="button"
                              className="bs-button bs-button--small bs-tooltip"
                              onClick={() => {
                                worldRef.current?.respawn();
                                notify("Respawning", "Teleported to the landing area.", "info");
                              }}
                            >
                              <span className="bs-tooltip__bubble">Teleports you to the closest respawn</span>
                              Respawn
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>Reset</td>
                          <td>
                            <button type="button" className="bs-button bs-button--small bs-tooltip" onClick={resetWorld}>
                              <span className="bs-tooltip__bubble">Resets every object</span>
                              Reset
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>Renderer</td>
                          <td>
                            <button
                              type="button"
                              className="bs-button bs-button--small bs-button--green bs-tooltip"
                              aria-disabled="true"
                            >
                              <span className="bs-tooltip__bubble">Best for compatibility</span>
                              <span>WebGL</span>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>Server</td>
                          <td>
                            <button
                              type="button"
                              className="bs-button bs-button--small bs-tooltip"
                              aria-disabled="true"
                            >
                              <span className="bs-tooltip__bubble">This clone runs entirely in your browser</span>
                              <span>Local</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Playground — controls */}
                <div className={`bs-menu__content controls-content ${menu === "controls" ? "is-visible" : ""}`} inert={menu !== "controls"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">Playground</div>
                    <p className="bs-text bs-playground__lede">
                      Drive, drift and explore. The island hides eight areas — including the AI Lab beyond the
                      Projects road. Bring a keyboard, a gamepad or a touch screen.
                    </p>
                    <div className="bs-tabs">
                      <div className="bs-tabs__nav">
                        {CONTROLS.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            className={`bs-tabs__tab ${tab === group.id ? "is-active" : ""}`}
                            onClick={() => setTab(group.id)}
                          >
                            <span className="bs-tabs__bg" />
                            <span className="bs-tabs__icon">
                              <img
                                src={ui(
                                  group.id === "mouse-keyboard"
                                    ? "controls/mouse-keyboard.svg"
                                    : group.id === "touch"
                                      ? "controls/touch.svg"
                                      : "controls/gamepad.svg",
                                )}
                                alt=""
                                width={group.id === "touch" ? 16 : 34}
                                height={22}
                              />
                            </span>
                            <span className="bs-tabs__label">{group.label}</span>
                          </button>
                        ))}
                      </div>
                      {CONTROLS.map((group) => (
                        <div key={group.id} className={`bs-tabs__panel ${tab === group.id ? "is-active" : ""}`}>
                          <table>
                            <tbody>
                              {group.rows.map((row) => (
                                <tr key={row.action}>
                                  <td>
                                    {row.keys.map((key, index) => (
                                      <span key={key}>
                                        {index > 0 && (
                                          <span style={{ opacity: 0.6 }}> {row.separator ?? "/"} </span>
                                        )}
                                        <span className="bs-key">{key}</span>
                                      </span>
                                    ))}
                                  </td>
                                  <td>{row.action}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                <div className={`bs-menu__content bs-achievements ${menu === "achievements" ? "is-visible" : ""}`} inert={menu !== "achievements"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">Achievements</div>
                    <div className="bs-achievements__progress">
                      <span className="bs-achievements__ratio">
                        {doneCount} / {totalAchievements}
                      </span>
                    </div>

                    <div className="bs-achievements__rewards-title bs-title bs-title--sm">Rewards</div>
                    <div className="bs-rewards">
                      {REWARDS.map((reward, index) => {
                        const unlocked = doneCount > index;
                        return (
                          <div
                            key={reward}
                            className={`bs-reward bs-tooltip ${unlocked ? "is-unlocked" : ""} ${doneCount === index + 1 ? "is-active" : ""}`}
                          >
                            <span className="bs-tooltip__bubble">
                              {unlocked ? "Unlocked" : `Unlock with ${index + 1} achievement${index === 0 ? "" : "s"}`}
                            </span>
                            <img
                              className="bs-reward__picture"
                              src={ui(`achievements/rewards/${reward}.webp`)}
                              alt={`${reward} car reward`}
                            />
                            <span className="bs-reward__lock">
                              <img src={ui("lock.svg")} alt="" />
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bs-achievements__items">
                      {ACHIEVEMENTS.map((item) => {
                        const value = progress[item.id] ?? 0;
                        const done = value >= item.target;
                        return (
                          <div key={item.id} className={`bs-achievement ${done ? "is-done" : ""}`}>
                            <div className="bs-title bs-achievement__title">{item.title}</div>
                            <div className="bs-achievement__row">
                              <p className="bs-text">{item.description}</p>
                              <span className="bs-achievement__progress">
                                {value}/{item.target}
                              </span>
                            </div>
                            <div className="bs-achievement__bar">
                              <div
                                className="bs-achievement__fill"
                                style={{ transform: `scaleX(${Math.min(1, value / item.target)})` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button type="button" className="bs-button bs-achievements__reset" onClick={resetAchievements}>
                      Reset achievements
                    </button>
                  </div>
                </div>

                {/* Circuit */}
                <div className={`bs-menu__content circuit-content ${menu === "circuit" ? "is-visible" : ""}`} inert={menu !== "circuit"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">Circuit</div>
                    <p className="bs-text bs-text--danger bs-circuit__offline">
                      <img src={ui("warning.svg")} alt="" /> Server currently offline. Scores can&apos;t be saved.
                    </p>

                    <div className="bs-circuit__score">
                      <span className="bs-circuit__label">Your best lap</span>
                      <span className="bs-circuit__best">{bestLap === null ? "—" : formatTime(bestLap)}</span>
                    </div>

                    <p className="bs-text bs-circuit__hint">
                      Restart the race, then cross the start gate at the circuit and complete a full lap around the
                      ring road.
                    </p>

                    <div className="bs-circuit__actions">
                      <button type="button" className="bs-button" onClick={startRace}>
                        <svg viewBox="0 0 20 24" fill="none" aria-hidden="true">
                          <path
                            d="M17 5L10 10V6C5.58 6 2 9.58 2 14s3.58 8 8 8 8-3.58 8-8h2c0 5.52-4.48 10-10 10S0 19.52 0 14 4.48 4 10 4V0l7 5Z"
                            fill="currentColor"
                          />
                        </svg>
                        Restart
                      </button>
                      <button type="button" className="bs-button" onClick={endRace}>
                        End
                      </button>
                      <button type="button" className="bs-button" onClick={() => setMenu("controls")}>
                        Controls
                      </button>
                    </div>
                  </div>
                </div>

                {/* Whispers */}
                <div className={`bs-menu__content whispers-content ${menu === "whispers" ? "is-visible" : ""}`} inert={menu !== "whispers"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">Leave a whisper</div>
                    <p className="bs-text">Whispers are messages left by visitors.</p>
                    <p className="bs-text bs-text--small bs-text--faded">
                      - Everyone can see them
                      <br />
                      - New whispers remove old ones (max 30)
                      <br />
                      - One whisper per user
                      <br />
                      - Choose a flag
                      <br />
                      - No slur!
                      <br />- Max 30 characters
                    </p>
                    <p className="bs-text bs-text--danger bs-circuit__offline">
                      <img src={ui("warning.svg")} alt="" /> Server currently offline — whispers stay on this device.
                    </p>

                    <form className="bs-whisper-form" onSubmit={submitWhisper}>
                      <div className="bs-whisper-flag">
                        <button
                          type="button"
                          onClick={() => setFlagOpen((open) => !open)}
                          aria-label="Choose a flag"
                        >
                          <img src={flagUrl(flag)} alt={flag.toUpperCase()} />
                        </button>
                        {flagOpen && (
                          <div className="bs-flags">
                            {WHISPER_FLAGS.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  setFlag(item.code);
                                  setFlagOpen(false);
                                }}
                              >
                                <img src={flagUrl(item.code)} alt="" />
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        className="bs-whisper-input"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Your message"
                        maxLength={30}
                        aria-label="Your whisper"
                      />
                      <button
                        type="submit"
                        className={`bs-whisper-submit ${message.trim() ? "is-valid" : ""}`}
                        aria-label="Post whisper"
                      >
                        <svg viewBox="0 0 39 38" fill="none" aria-hidden="true">
                          <path
                            d="M11 26c8.5-3.7 9.2-19.2 8.6-22 1 8.8 3.2 16 8.5 22-9-2.2-13.4-.6-17.1 0Z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path d="M30 17v-8M26 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Projects */}
                <div className={`bs-menu__content bs-projects-content ${menu === "projects" ? "is-visible" : ""}`} inert={menu !== "projects"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">Projects</div>
                    <ProjectShowcase
                      projects={PROJECTS}
                      selectedId={projectId}
                      onSelect={setProjectId}
                      variant="projects"
                    />
                  </div>
                </div>

                {/* AI Lab */}
                <div className={`bs-menu__content bs-lab-content ${menu === "lab" ? "is-visible" : ""}`} inert={menu !== "lab"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-lab-heading">
                      <div>
                        <div className="bs-lab-heading__eyebrow">RESEARCH FACILITY</div>
                        <div className="bs-title">AI Lab</div>
                      </div>
                      <span className="bs-lab-status">
                        <span className="bs-lab-status__dot" />
                        ONLINE
                      </span>
                    </div>
                    <p className="bs-text bs-lab-lede">
                      Applied AI builds: generative AI irrigation, healthcare queues, automated video editing,
                      local coding agents and data analysis. Select a terminal to inspect the project.
                    </p>
                    <div className="bs-tags bs-lab-focus" aria-label="AI research focus">
                      {["Computer Vision", "NLP", "Generative AI", "RAG", "LLM Integration"].map((focus) => (
                        <span key={focus} className="bs-tag bs-tag--cyan">
                          {focus}
                        </span>
                      ))}
                    </div>
                    <ProjectShowcase
                      projects={AI_PROJECTS}
                      selectedId={labProjectId}
                      onSelect={setLabProjectId}
                      variant="lab"
                    />
                  </div>
                </div>

                {/* Behind the scene */}
                <div className={`bs-menu__content bs-behind ${menu === "behindTheScene" ? "is-visible" : ""}`} inert={menu !== "behindTheScene"}>
                  <div className="bs-menu__content-inner">
                    <div className="bs-title">About this build</div>
                    <p className="bs-text">
                      This is <strong>Mohamed Faazil&apos;s</strong> drivable portfolio: a small explorable island
                      built with Next.js, React and Three.js. Drive between the Workshop, Playground, Monument,
                      Circuit, Whisper Wall, Projects and the AI Lab.
                    </p>

                    <h2 className="bs-title bs-title--sm">Original architecture</h2>
                    <p className="bs-text">
                      The world and interaction model are reconstructed from{" "}
                      <a href="https://github.com/brunosimon/folio-2025" target="_blank" rel="noreferrer">
                        Bruno Simon&apos;s folio-2025
                      </a>
                      , which is built with{" "}
                      <a href="https://threejs.org" target="_blank" rel="noreferrer">
                        Three.js
                      </a>{" "}
                      and{" "}
                      <a href="https://rapier.rs" target="_blank" rel="noreferrer">
                        Rapier
                      </a>
                      . The original is MIT licensed and remains the property of its author.
                    </p>

                    <h2 className="bs-title bs-title--sm">This portfolio</h2>
                    <p className="bs-text">
                      Next.js 16, React 19 and Three.js. Car physics, camera, map, achievements, the AI Lab and the
                      interface are implemented in this project. All scenery is generated in the browser from
                      low-poly primitives.
                    </p>

                    <h2 className="bs-title bs-title--sm">Performance</h2>
                    <p className="bs-text">
                      The experience includes high and low quality modes, reduced pixel ratio and shadow resolution
                      on weaker hardware, cached area lookups, pooled dust particles and reduced-motion support for
                      the camera and environmental animation.
                    </p>

                    <h2 className="bs-title bs-title--sm">Music</h2>
                    <p className="bs-text">
                      “Baguira” by Kounine, released under{" "}
                      <a href="https://choosealicense.com/licenses/cc0-1.0/" target="_blank" rel="noreferrer">
                        CC0
                      </a>
                      .
                    </p>

                    <p className="bs-text bs-text--faded bs-text--right">— an interactive portfolio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="bs-map" role="dialog" aria-modal="true" aria-label="Island map">
          <div className="bs-map__panel" ref={mapRef}>
            <button type="button" className="bs-map__close" onClick={closeMap} aria-label="Close map">
              <span className="bs-menu__close-inner">
                <span className="bs-menu__close-icon">
                  <img src={ui("close.svg")} alt="" />
                </span>
              </span>
            </button>
            <svg viewBox="-125 -125 250 250" role="img" aria-label="Map of the island">
              <defs>
                <radialGradient id="bs-map-lab-glow">
                  <stop offset="0%" stopColor="#4ad9ff" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#4ad9ff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle r="112" fill="#efc496" stroke="#c99163" strokeWidth="2" />
              <circle r="110" fill="none" stroke="#ffe3bd" strokeWidth="1" opacity="0.5" />
              <path
                d="M-7 7 L17 6 L8 -6 L0 -28 L-20 -25 L-69 -36 M17 6 L76 51 M-7 7 L-15 26"
                fill="none"
                stroke="#f7d3a6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />
              {AREAS.map((area) => {
                return (
                  <line
                    key={`spoke-${area.id}`}
                    x1={0}
                    y1={0}
                    x2={area.worldPosition.x}
                    y2={area.worldPosition.z}
                    stroke={area.id === "lab" ? "#4ad9ff" : "#f7d3a6"}
                    strokeWidth="3"
                    opacity="0.85"
                  />
                );
              })}
              <circle r="19" fill="#f7d3a6" stroke="#c99163" strokeWidth="1.5" />
              <text
                x="0"
                y="2"
                textAnchor="middle"
                fill="#b06a4d"
                fontSize="6"
                fontFamily="var(--font-amatic), sans-serif"
                fontWeight="700"
              >
                FAAZIL
              </text>

              {AREAS.map((area) => {
                const x = area.worldPosition.x;
                const y = area.worldPosition.z;
                return (
                  <g
                    key={area.id}
                    className={`bs-map__pin ${tick.area === area.id ? "is-active" : ""} ${area.id === "lab" ? "is-lab" : ""}`}
                    transform={`translate(${x} ${y})`}
                    onClick={() => teleport(area.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        teleport(area.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Travel to ${area.label}`}
                  >
                    {area.id === "lab" && <circle r="11" fill="url(#bs-map-lab-glow)" className="bs-map__lab-glow" />}
                    <circle r="4" />
                    <text y="-6">{area.short}</text>
                  </g>
                );
              })}

              <g
                className="bs-map__player"
                transform={`translate(${tick.x} ${tick.z}) rotate(${180 - (tick.heading * 180) / Math.PI})`}
              >
                <circle r="3" />
                <path d="M0 -7 L3 1 L0 -1 L-3 1 Z" fill="#251f2b" />
              </g>
            </svg>
            <div className="bs-map__legend">{touchDevice ? "Tap" : "Click or press Enter on"} a location to travel</div>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="bs-notifications" role="status" aria-live="polite">
          {notifications.map((toast) => (
            <div
              key={toast.id}
              className={`bs-notification ${toast.variant === "info" ? "bs-notification--info" : ""} ${toast.variant === "song" ? "bs-notification--song" : ""} ${toast.variant === "area" ? "bs-notification--area" : ""}`}
            >
              <div className="bs-notification__title">{toast.title}</div>
              {toast.text && <div className="bs-notification__text">{toast.text}</div>}
              <div className="bs-notification__bar" />
            </div>
          ))}
        </div>
      )}

      <div className={`bs-flash ${flash ? "is-on" : ""}`} />

      {phase === "playing" && !menu && !mapOpen && (
        <div className="bs-hint">
          {touchDevice
            ? "drag left side to drive · right side to look · tap the prompt to explore"
            : "WASD / arrows to drive · shift to boost · space to jump · enter to interact · M for map"}
        </div>
      )}
    </div>
  );
}

function HomePreview() {
  return (
    <div className="bs-custom-preview bs-home-preview" aria-hidden="true">
      <div className="bs-home-preview__grid" />
      <span className="bs-custom-preview__eyebrow">INTERACTIVE PORTFOLIO</span>
      <strong>
        MOHAMED
        <br />
        FAAZIL
      </strong>
      <span className="bs-home-preview__role">AI &amp; FULL STACK DEVELOPER</span>
      <span className="bs-home-preview__line" />
      <span className="bs-home-preview__tagline">Intelligent applications. Interactive worlds.</span>
      <span className="bs-home-preview__chips">
        <span>PYTHON</span>
        <span>REACT</span>
        <span>LLMs</span>
      </span>
    </div>
  );
}

function ProjectsPreview() {
  return (
    <div className="bs-custom-preview bs-projects-preview" aria-hidden="true">
      <span className="bs-custom-preview__eyebrow">PROJECT FILES</span>
      <strong>
        {String(PROJECTS.length).padStart(2, "0")}
        <span>BUILDS</span>
      </strong>
      <div className="bs-projects-preview__stack">
        {PROJECTS.map((project, index) => (
          <span key={project.id} style={{ borderColor: project.accent }}>
            <i>{String(index + 1).padStart(2, "0")}</i>
            {project.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function AiLabPreview() {
  return (
    <div className="bs-custom-preview bs-lab-preview" aria-hidden="true">
      <div className="bs-lab-preview__grid" />
      <div className="bs-lab-preview__orbit">
        <span />
        <span />
        <strong>AI</strong>
      </div>
      <span className="bs-custom-preview__eyebrow">NEURAL SYSTEMS</span>
      <strong>AI LAB</strong>
      <span className="bs-lab-preview__status">
        <span /> ONLINE · {AI_PROJECTS.length} PROJECTS
      </span>
      <span className="bs-lab-preview__nodes">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((node) => (
          <i key={node} style={{ animationDelay: `${node * 0.22}s` }} />
        ))}
      </span>
    </div>
  );
}
