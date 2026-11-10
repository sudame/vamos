import { render } from "preact";
import { App } from "./app.jsx";
import { registerOffline } from "./offline.js";
import { unlockAudioOnFirstTap } from "./speech.js";
import "@fontsource-variable/literata/wght.css";
import "./style.css";

registerOffline();
unlockAudioOnFirstTap();
render(<App />, document.getElementById("app"));
