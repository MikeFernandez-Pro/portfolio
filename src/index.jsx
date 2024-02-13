"use strict";

import App from "./App";
import "./style.css";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(document.querySelector("#root"));

document.addEventListener("contextmenu", (event) => event.preventDefault());

root.render(<App />);
