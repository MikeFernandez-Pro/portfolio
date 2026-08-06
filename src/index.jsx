"use strict";

import App from "./App";
import "./style.css";
import ReactDOM from "react-dom/client";

// Silence known deprecation warnings emitted by libraries we can't fix yet:
// - THREE.Clock: instantiated internally by @react-three/fiber
// - rapier wasm init(): called internally by @react-three/rapier
// Remove once those packages update.
const SILENCED_WARNINGS = [
  "THREE.Clock: This module has been deprecated.",
  "using deprecated parameters for the initialization function",
];

const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    SILENCED_WARNINGS.some(warning => args[0].includes(warning))
  ) {
    return;
  }
  originalWarn(...args);
};

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(<App />);
