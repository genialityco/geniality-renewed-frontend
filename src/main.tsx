// import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { captureEngagementClick } from "./services/engagementService";

// Antes de montar la app: el router puede redirigir y perder el ?ref=
captureEngagementClick();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
