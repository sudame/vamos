import { render } from "preact";
import { App } from "./app.tsx";
import { registerOffline } from "./offline.ts";
import { unlockAudioOnFirstTap } from "./speech.ts";
import "@fontsource-variable/literata/wght.css";
import "./style.css";

registerOffline();
unlockAudioOnFirstTap();
// #app は index.html にある
render(<App />, document.getElementById("app") as HTMLElement);
