import { getFieldStatus } from "@/components/signal/fieldStatus";
import { getMotionPrefs } from "@/components/signal/motionPrefs";
import { onIdle } from "@/components/signal/schedule";

/**
 * The visitors globe's client: counts this visit once per session, then asks the Worker for the map. It lives in
 * the main bundle and stays small on purpose; everything visual loads only when the egg is opened.
 *
 * HONESTY: the egg exists only if `GET /visits` answered with a well-formed map. No Worker URL, an unreachable
 * Worker or a malformed reply leave the status `offline` and the egg (and its footer hint) stays hidden. Nothing
 * is ever faked, except `?visits=demo` on a local development host, which loads clearly labelled sample data.
 */

export type VisitCell = readonly [lat: number, lon: number, count: number];
export type VisitsData = {
  cells: VisitCell[];
  total: number;
  /** [ISO country code, visitors], busiest first. */
  countries: Array<[string, number]>;
  updatedAt: string | null;
  /** True only for the local `?visits=demo` sample data. */
  demo: boolean;
};
/** The viewer's own cell, as the Worker answered POST /visit. */
export type YouCell = { lat: number; lon: number; country: string | null; counted: boolean };

type Status = "idle" | "probing" | "ready" | "offline";
/** `globe`: the particle field turns into the visitors globe. `map`: a light 2D dot map (phones, no live WebGL). */
export type VisitsView = "globe" | "map";
type State = { status: Status; data: VisitsData | null; you: YouCell | null; open: boolean; view: VisitsView };

const PHONE_MAX_WIDTH = 768;

const SESSION_KEY = "visits:you";
const REQUEST_TIMEOUT_MS = 6000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The Director's Worker serves this too: its URL is the site's only backend setting. Inlined at build time. */
const DIRECTOR_URL = process.env.NEXT_PUBLIC_DIRECTOR_URL;
const WORKER_BASE = DIRECTOR_URL ? DIRECTOR_URL.replace(/\/+$/, "").replace(/\/director$/, "") : "";

const IDLE: State = { status: "idle", data: null, you: null, open: false, view: "map" };
let state: State = IDLE;
const listeners = new Set<() => void>();

export const getVisitsState = (): Readonly<State> => state;
export const getVisitsServerState = (): Readonly<State> => IDLE;

export function subscribeVisits(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function patch(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const isVisitsConfigured = () => Boolean(WORKER_BASE);

/**
 * The live particle globe only where the field is running on a desktop; everything else gets the 2D map. Software GL
 * never reaches `live` in production (the field falls back to its still), so "live" already means a real GPU there.
 */
function pickView(): VisitsView {
  const field = getFieldStatus();
  const phone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < PHONE_MAX_WIDTH;
  return field.mode === "live" && !phone && !getMotionPrefs().still ? "globe" : "map";
}

/** Opens the egg, but only if there is a real (or, on localhost, demo) map to show. */
export function openVisits() {
  if (state.status === "ready" && !state.open) patch({ open: true, view: pickView() });
}

/** Asks the open overlay to close itself (it fades out first). */
export const VISITS_CLOSE_EVENT = "visits:close";

export function closeVisits() {
  if (state.open) patch({ open: false });
}

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Accepts only the documented shape; anything else counts as offline. */
export function parseVisits(raw: unknown): VisitsData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { cells, total, countries, updatedAt } = raw as Record<string, unknown>;
  if (!Array.isArray(cells) || !isNum(total) || !Array.isArray(countries)) return null;
  const okCells = cells.filter((c): c is [number, number, number] => Array.isArray(c) && c.length === 3 && c.every(isNum) && c[2] > 0);
  const okCountries = countries.filter((c): c is [string, number] => Array.isArray(c) && typeof c[0] === "string" && isNum(c[1]));
  return { cells: okCells, total, countries: okCountries, updatedAt: typeof updatedAt === "string" ? updatedAt : null, demo: false };
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${WORKER_BASE}${path}`, { ...init, credentials: "omit", signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function parseYou(raw: unknown): YouCell | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { cell, country, counted } = raw as Record<string, unknown>;
  if (!Array.isArray(cell) || cell.length !== 2 || !isNum(cell[0]) || !isNum(cell[1])) return null;
  return { lat: cell[0], lon: cell[1], country: typeof country === "string" ? country : null, counted: counted === true };
}

/** One POST per browser session; the answer is kept so a later page load can still show "you are here". */
async function countThisVisit(): Promise<YouCell | null> {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved !== null) return saved ? parseYou(JSON.parse(saved)) : null;
    // Guard first, so two tabs or a quick reload never post twice.
    sessionStorage.setItem(SESSION_KEY, "");
  } catch {
    // Storage blocked: count once for this page load only, below.
  }
  const you = parseYou(await request("/visit", { method: "POST" }));
  try {
    if (you) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ cell: [you.lat, you.lon], country: you.country, counted: you.counted }));
  } catch {
    // Not remembered: harmless.
  }
  return you;
}

/** The viewer's own count is not in a cached map yet: make sure their cell shows, as a refresh would. */
function withViewer(data: VisitsData, you: YouCell | null): VisitsData {
  if (!you || !you.counted || data.cells.some(([lat, lon]) => lat === you.lat && lon === you.lon)) return data;
  return { ...data, cells: [...data.cells, [you.lat, you.lon, 1]], total: data.total + 1 };
}

async function probe() {
  const local = LOCAL_HOSTS.has(window.location.hostname);
  if (local && new URLSearchParams(window.location.search).get("visits") === "demo") {
    const { demoVisits } = await import("./demoVisits");
    const demo = demoVisits();
    patch({ status: "ready", data: demo.data, you: demo.you });
    return;
  }
  if (!WORKER_BASE) return patch({ status: "offline" });
  patch({ status: "probing" });
  const you = await countThisVisit();
  const data = parseVisits(await request("/visits"));
  if (!data) return patch({ status: "offline" });
  patch({ status: "ready", data: withViewer(data, you), you });
}

let started = false;

/** Once per page: after load and an idle slice, so none of this competes with first paint or the field. */
export function startVisits(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  let cancel = () => {};
  const run = () => {
    cancel = onIdle(() => void probe());
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
  return () => {
    window.removeEventListener("load", run);
    cancel();
    started = false;
  };
}
