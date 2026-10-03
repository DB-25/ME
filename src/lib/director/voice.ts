"use client";

import { useSyncExternalStore } from "react";
import { assetUrl } from "@/lib/asset";
import { lineId } from "./lineId";

/**
 * Where narration audio comes from. Every line in the voice library has a
 * pre-rendered recording, public/voice/<id>.mp3, and public/voice/manifest.json
 * lists the ids that exist, so the client never requests a file that is not there.
 * No manifest, or an empty one, means there is no voice: the toggle stays hidden
 * and the captions run on a timer.
 *
 * Option B, off by default: with NEXT_PUBLIC_DIRECTOR_TTS=server, a free-form live
 * line that is not in the library is sent to the worker (POST <director url>/tts,
 * { text }, audio/mpeg back) and played. Any failure means subtitles only.
 */

const MANIFEST_URL = "/voice/manifest.json";
const DIRECTOR_URL = process.env.NEXT_PUBLIC_DIRECTOR_URL;
const SERVER_TTS = process.env.NEXT_PUBLIC_DIRECTOR_TTS === "server" && Boolean(DIRECTOR_URL);
const TTS_TIMEOUT_MS = 10_000;

let available = false;
let ids = new Set<string>();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/** Read the manifest once. Never rejects. */
export function loadManifest(): Promise<void> {
  loading ??= fetch(assetUrl(MANIFEST_URL), { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((json: unknown) => {
      const list = (json as { ids?: unknown } | null)?.ids;
      if (!Array.isArray(list)) return;
      ids = new Set(list.filter((x): x is string => typeof x === "string"));
    })
    .catch(() => undefined)
    .then(() => {
      available = ids.size > 0 || SERVER_TTS;
      notify();
    });
  return loading;
}

const serverAudio = new Map<string, Promise<string | null>>();

/** Server text to speech for one free-form line (option B). Resolves to an object URL, or null. */
function fetchServerAudio(text: string): Promise<string | null> {
  const cached = serverAudio.get(text);
  if (cached) return cached;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  const request = fetch(`${DIRECTOR_URL!.replace(/\/+$/, "")}/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("audio")) return null;
      return URL.createObjectURL(await res.blob());
    })
    .catch(() => null)
    .finally(() => window.clearTimeout(timer));
  serverAudio.set(text, request);
  return request;
}

/**
 * The audio URL for one narration line, or null when there is none.
 *
 * This is the single place that decides where a line's sound comes from: the
 * recording for its id if the library has one, otherwise (only when server TTS is
 * switched on) audio rendered by the worker. The player and the Narrator do not
 * care which.
 */
export async function getLineAudio(text: string): Promise<string | null> {
  await loadManifest();
  const id = lineId(text);
  if (ids.has(id)) return assetUrl(`/voice/${id}.mp3`);
  return SERVER_TTS ? fetchServerAudio(text) : null;
}

/* ---------- the visitor's preference ---------- */

const PREF_KEY = "director:voice";
/** Holds the choice when storage is unavailable. */
let memory: boolean | null = null;

function readPreference(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setVoicePreferred(on: boolean) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    memory = on; // private mode or blocked storage: the choice lasts for this page view
  }
  notify();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  void loadManifest();
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

/** Voice on or off, remembered across visits. Defaults to on. */
export function useVoicePreference(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, readPreference, () => true);
  return [on, setVoicePreferred];
}

/** True once the manifest says audio exists. False on the server and until it loads. */
export function useVoiceAvailable(): boolean {
  return useSyncExternalStore(subscribe, () => available, () => false);
}

/** Should the next line be played aloud? */
export const shouldPlayVoice = () => available && readPreference();
