/**
 * Store Pinia para el explorador de archivos.
 * Maneja navegacion, seleccion y operaciones de archivos.
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { usbService } from "@/services/usbService";
import { useDevicesStore } from "./devices";
import {
  CACHE_TTL_MS,
  CACHE_CLEANUP_INTERVAL_MS,
  REFRESH_AFTER_OPERATION_MS
} from "@/utils";
import type { FileInfo } from "@/types";
import { serializeDeviceId } from "@/types";

// Cache de directorios
interface CacheEntry {
  files: FileInfo[];
  timestamp: number;
}
const directorioCache = new Map<string, CacheEntry>();

export const useFileBrowserStore = defineStore("fileBrowser", () => {
  const devicesStore = useDevicesStore();

  // Estado
  const currentPath = ref("/");
  const files = ref<FileInfo[]>([]);
  const selectedFiles = ref<Set<string>>(new Set());
  const isLoading = ref(false);
  const showHidden = ref(false);
  const lastError = ref<Error | null>(null);
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);

  // Getters computados
  const visibleFiles = computed(() => {
    if (showHidden.value) return files.value;
    return files.value.filter((f) => !f.path.startsWith("."));
  });

  const sortedFiles = computed(() => {
    return [...visibleFiles.value].sort((a, b) => {
      // Directorios primero
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      // Luego alfabeticamente
      return a.path.localeCompare(b.path);
    });
  });

  const breadcrumbs = computed(() => {
    const parts = currentPath.value.split("/").filter(Boolean);
    const crumbs = [{ name: "Root", path: "/" }];

    let accumulated = "";
    for (const part of parts) {
      accumulated += `/${part}`;
      crumbs.push({ name: part, path: accumulated });
    }

    return crumbs;
  });

  const canGoBack = computed(() => historyIndex.value > 0);
  const canGoForward = computed(
    () => historyIndex.value < history.value.length - 1
  );

  const selectedCount = computed(() => selectedFiles.value.size);

  const selectedFilesList = computed(() => {
    return files.value.filter((f) =>
      selectedFiles.value.has(`${currentPath.value}/${f.path}`)
    );
  });

  // Acciones
  async function loadDirectory(path: string = currentPath.value, forzarRecarga = false) {
    const device = devicesStore.selectedDevice;
    if (!device?.info) return;

    const cacheKey = `${serializeDeviceId(device.id)}:${path}`;
    const ahora = Date.now();

    // Verificar cache si no se fuerza recarga
    if (!forzarRecarga) {
      const cached = directorioCache.get(cacheKey);
      if (cached && ahora - cached.timestamp < CACHE_TTL_MS) {
        files.value = cached.files;
        currentPath.value = path;
        selectedFiles.value.clear();
        return;
      }
    }

    isLoading.value = true;
    lastError.value = null;

    try {
      const resultado = await usbService.listDir(device.id, path);
      files.value = resultado;
      currentPath.value = path;
      selectedFiles.value.clear();

      // Guardar en cache
      directorioCache.set(cacheKey, {
        files: resultado,
        timestamp: ahora,
      });
    } catch (e) {
      lastError.value = e as Error;
      console.error("Error cargando directorio:", e);
    } finally {
      isLoading.value = false;
    }
  }

  async function navigateTo(path: string) {
    // Agregar al historial
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    history.value.push(path);
    historyIndex.value = history.value.length - 1;

    await loadDirectory(path);
  }

  async function goBack() {
    if (!canGoBack.value) return;
    historyIndex.value--;
    await loadDirectory(history.value[historyIndex.value]);
  }

  async function goForward() {
    if (!canGoForward.value) return;
    historyIndex.value++;
    await loadDirectory(history.value[historyIndex.value]);
  }

  async function goUp() {
    if (currentPath.value === "/") return;
    const parentPath = currentPath.value.split("/").slice(0, -1).join("/") || "/";
    await navigateTo(parentPath);
  }

  async function refresh() {
    await loadDirectory(currentPath.value, true); // Forzar recarga, ignorar cache
  }

  function toggleFileSelection(file: FileInfo) {
    const fullPath = `${currentPath.value}/${file.path}`;
    if (selectedFiles.value.has(fullPath)) {
      selectedFiles.value.delete(fullPath);
    } else {
      selectedFiles.value.add(fullPath);
    }
  }

  function selectFile(file: FileInfo) {
    selectedFiles.value.clear();
    selectedFiles.value.add(`${currentPath.value}/${file.path}`);
  }

  function clearSelection() {
    selectedFiles.value.clear();
  }

  function selectAll() {
    selectedFiles.value.clear();
    for (const file of visibleFiles.value) {
      selectedFiles.value.add(`${currentPath.value}/${file.path}`);
    }
  }

  async function openItem(file: FileInfo) {
    if (file.isDir) {
      const newPath =
        currentPath.value === "/"
          ? `/${file.path}`
          : `${currentPath.value}/${file.path}`;
      await navigateTo(newPath);
    } else {
      // Descargar archivo
      const device = devicesStore.selectedDevice;
      if (!device) return;

      const key = serializeDeviceId(device.id);
      const fullPath =
        currentPath.value === "/"
          ? `/${file.path}`
          : `${currentPath.value}/${file.path}`;

      devicesStore.addToQueue(key, {
        type: "download",
        path: fullPath,
        size: file.size,
      });
    }
  }

  async function deleteSelected() {
    const device = devicesStore.selectedDevice;
    if (!device) return;

    const key = serializeDeviceId(device.id);

    for (const fullPath of selectedFiles.value) {
      const file = files.value.find(
        (f) => `${currentPath.value}/${f.path}` === fullPath
      );
      if (file) {
        devicesStore.addToQueue(key, {
          type: "delete",
          path: fullPath,
          isDir: file.isDir,
        });
      }
    }

    selectedFiles.value.clear();
    // Refrescar despues de un delay
    setTimeout(() => refresh(), REFRESH_AFTER_OPERATION_MS);
  }

  async function createDirectory(name: string) {
    const device = devicesStore.selectedDevice;
    if (!device) return;

    const key = serializeDeviceId(device.id);
    const fullPath =
      currentPath.value === "/" ? `/${name}` : `${currentPath.value}/${name}`;

    devicesStore.addToQueue(key, {
      type: "createDir",
      path: fullPath,
    });

    setTimeout(() => refresh(), 500);
  }

  /**
   * Abre dialogo nativo para seleccionar y subir archivos.
   * Usa rutas absolutas del sistema para que el backend Rust pueda acceder a los archivos.
   */
  async function uploadFiles() {
    const device = devicesStore.selectedDevice;
    if (!device) return;

    const rutas = await usbService.selectFilesForUpload();
    if (rutas.length === 0) return;

    const key = serializeDeviceId(device.id);

    for (const src of rutas) {
      devicesStore.addToQueue(key, {
        type: "upload",
        path: currentPath.value,
        src,
      });
    }

    setTimeout(() => refresh(), REFRESH_AFTER_OPERATION_MS);
  }

  /**
   * Sube archivos desde rutas absolutas (usado por drag and drop).
   * Las rutas vienen directamente del sistema de archivos.
   */
  async function uploadFilesFromPaths(rutas: string[]) {
    const device = devicesStore.selectedDevice;
    if (!device) return;

    const key = serializeDeviceId(device.id);

    for (const src of rutas) {
      devicesStore.addToQueue(key, {
        type: "upload",
        path: currentPath.value,
        src,
      });
    }

    setTimeout(() => refresh(), 500);
  }

  function reset() {
    currentPath.value = "/";
    files.value = [];
    selectedFiles.value.clear();
    history.value = [];
    historyIndex.value = -1;
    directorioCache.clear(); // Limpiar cache al resetear
  }

  // Limpiar entradas expiradas del cache periodicamente
  function limpiarCacheExpirado() {
    const ahora = Date.now();
    for (const [key, entry] of directorioCache.entries()) {
      if (ahora - entry.timestamp > CACHE_TTL_MS) {
        directorioCache.delete(key);
      }
    }
  }

  // Ejecutar limpieza cada minuto (con cleanup para evitar memory leaks)
  const intervalId = setInterval(limpiarCacheExpirado, CACHE_CLEANUP_INTERVAL_MS);

  // Limpiar intervalo cuando el store se desmonte
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => clearInterval(intervalId));
  }

  return {
    // Estado
    currentPath,
    files,
    selectedFiles,
    isLoading,
    showHidden,
    lastError,
    // Getters
    visibleFiles,
    sortedFiles,
    breadcrumbs,
    canGoBack,
    canGoForward,
    selectedCount,
    selectedFilesList,
    // Acciones
    loadDirectory,
    navigateTo,
    goBack,
    goForward,
    goUp,
    refresh,
    toggleFileSelection,
    selectFile,
    clearSelection,
    selectAll,
    openItem,
    deleteSelected,
    createDirectory,
    uploadFiles,
    uploadFilesFromPaths,
    reset,
  };
});
