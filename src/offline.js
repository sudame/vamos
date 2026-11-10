// Service Worker を登録し、オフラインで使える状態かを知らせる。

import { registerSW } from "virtual:pwa-register";

const listeners = new Set();
let status = "checking"; // checking / ready / unsupported / error

function set(s) {
  status = s;
  for (const fn of listeners) fn(s);
}

export function offlineStatus() {
  return status;
}

export function onOfflineStatus(fn) {
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
