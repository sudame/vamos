import { useCallback, useEffect, useState } from "preact/hooks";
import { Browse } from "./screens/Browse.jsx";
import { Drill } from "./screens/Drill.jsx";
import { GrammarList, GrammarNote } from "./screens/Grammar.jsx";
import { Home } from "./screens/Home.jsx";
import { PhrasePage } from "./screens/PhrasePage.jsx";
import { Settings } from "./screens/Settings.jsx";
import { load, save } from "./storage.js";

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [name = "", arg = ""] = h.split("/");
  return { name, arg: decodeURIComponent(arg) };
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

function useTheme(theme) {
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

  const update = useCallback((fn) => {
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
    case "phrase":
      return <PhrasePage {...props} id={route.arg} />;
    case "grammar":
      return route.arg ? <GrammarNote {...props} id={route.arg} /> : <GrammarList {...props} />;
    case "settings":
      return <Settings {...props} />;
    default:
      return <Home {...props} />;
  }
}
