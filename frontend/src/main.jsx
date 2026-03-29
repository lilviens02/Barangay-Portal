import React from "react";
import ReactDOM from "react-dom/client";
import '@fortawesome/fontawesome-free/css/all.min.css';

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./index.css";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);