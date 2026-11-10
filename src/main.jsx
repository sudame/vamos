import { render } from "preact";
import { App } from "./app.jsx";
import { registerOffline } from "./offline.js";
import "./style.css";

registerOffline();
render(<App />, document.getElementById("app"));
