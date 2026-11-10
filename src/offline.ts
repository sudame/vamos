// Service Worker を登録し、オフラインで使える状態かを知らせる。

import { registerSW } from "virtual:pwa-register";
import type { OfflineStatus } from "./types.ts";

const listeners = new Set<(s: OfflineStatus) => void>();
let status: OfflineStatus = "checking";

function set(s: OfflineStatus) {
  status = s;
  for (const fn of listeners) fn(s);
}

export function offlineStatus(): OfflineStatus {
  return status;
}

export function onOfflineStatus(fn: (s: OfflineStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function registerOffline() {
  if (!("serviceWorker" in navigator)) {
    set("unsupported");
    return;
  }
  registerSW({
    immediate: true,
    onOfflineReady() {
      set("ready");
    },
    onRegisteredSW(_url, reg) {
      // 2 回目以降の起動では onOfflineReady が来ないので、有効な SW があれば準備済みとみなす
      if (reg?.active) set("ready");
    },
    onRegisterError() {
      set("error");
    },
  });
}
