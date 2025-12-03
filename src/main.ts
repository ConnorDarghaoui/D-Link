import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import "@unocss/reset/tailwind.css";
import "virtual:uno.css";

// Deshabilitar menu contextual del navegador (para que no parezca web)
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Deshabilitar atajos de navegador que revelan que es web
document.addEventListener("keydown", (e) => {
  // Ctrl+R, Ctrl+Shift+R (recargar)
  if ((e.ctrlKey || e.metaKey) && e.key === "r") e.preventDefault();
  // Ctrl+U (ver codigo fuente)
  if ((e.ctrlKey || e.metaKey) && e.key === "u") e.preventDefault();
  // F5 (recargar) - comentado por si lo necesitas en desarrollo
  // if (e.key === "F5") e.preventDefault();
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
