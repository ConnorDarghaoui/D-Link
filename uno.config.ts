import {
  defineConfig,
  presetWind,
  presetIcons,
  transformerDirectives,
} from "unocss";

export default defineConfig({
  presets: [
    presetWind(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
    }),
  ],
  transformers: [transformerDirectives()],
  shortcuts: {
    "btn-primary":
      "px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium",
    "btn-secondary":
      "px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all",
    "btn-icon":
      "p-2 rounded-md text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 disabled:opacity-30 transition-all",
    "input-field":
      "px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all",
    "card": "bg-white rounded-xl shadow-sm border border-gray-100",
  },
});
