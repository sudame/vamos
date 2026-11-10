import { useCallback, useEffect, useState } from "preact/hooks";
import { Browse } from "./screens/Browse.tsx";
import { Drill } from "./screens/Drill.tsx";
import { GrammarList, GrammarNote } from "./screens/Grammar.tsx";
import { Home } from "./screens/Home.tsx";
import { Settings } from "./screens/Settings.tsx";
import { setSpeechPrefs } from "./speech.ts";
import { load, save } from "./storage.ts";
import type { State, Theme } from "./types.ts";

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [name = "", arg = ""] = h.split("/");
  try {
    return { name, arg: decodeURIComponent(arg) };
  } catch {
    return { name, arg: "" };
  }
}

function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const h = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return route;
}

function useTheme(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
  }, [theme]);
}

export function App() {
  const [state, setState] = useState(load);
  const route = useRoute();
  useTheme(state.settings.theme);
  setSpeechPrefs({ useRecorded: state.settings.useRecorded });

  const update = useCallback((fn: (prev: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const props = { state, update };
  switch (route.name) {
    case "drill":
      return <Drill {...props} />;
    case "browse":
      return <Browse {...props} cat={route.arg} />;
    case "grammar":
      return route.arg ? <GrammarNote {...props} id={route.arg} /> : <GrammarList {...props} />;
    case "settings":
      return <Settings {...props} />;
    default:
      return <Home {...props} />;
  }
}
