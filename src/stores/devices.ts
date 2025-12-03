/**
 * Store Pinia para gestion de dispositivos USB.
 * Maneja el estado reactivo de dispositivos, cola de operaciones y progreso.
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { listen } from "@tauri-apps/api/event";
import { usbService } from "@/services/usbService";
import type {
  Device,
  DeviceId,
  QueueAction,
  QueueItem,
  ProgressUpdate,
} from "@/types";
import { serializeDeviceId } from "@/types";

export const useDevicesStore = defineStore("devices", () => {
  // Estado
  const devices = ref<Map<string, Device>>(new Map());
  const selectedDeviceKey = ref<string | null>(null);
  const isEnumerating = ref(false);
  const hasEnumerated = ref(false);
  const queue = ref<Map<string, QueueItem[]>>(new Map());
  const runningQueues = ref<Set<string>>(new Set());
  const lastError = ref<Error | null>(null);

  let queueIdCounter = 0;
  
  // Debounce para actualizaciones de progreso (evita re-renders excesivos)
  let ultimoProgresoTimestamp = 0;
  const DEBOUNCE_PROGRESO_MS = 50; // Minimo 50ms entre actualizaciones

  // Getters computados
  const deviceList = computed(() => Array.from(devices.value.values()));

  const selectedDevice = computed(() => {
    if (!selectedDeviceKey.value) return null;
    return devices.value.get(selectedDeviceKey.value) ?? null;
  });

  const selectedDeviceQueue = computed(() => {
    if (!selectedDeviceKey.value) return [];
    return queue.value.get(selectedDeviceKey.value) ?? [];
  });

  // Acciones
  function addDevice(payload: {
    busNumber: number;
    address: number;
    name: string;
    isCxIi: boolean;
    needsDrivers: boolean;
  }) {
    const id: DeviceId = {
      busNumber: payload.busNumber,
      address: payload.address,
    };
    const key = serializeDeviceId(id);

    devices.value.set(key, {
      id,
      name: payload.name,
      isCxII: payload.isCxIi,
      needsDrivers: payload.needsDrivers,
      info: null,
      isLoading: false,
    });

    // Seleccionar automaticamente si es el primero
    if (!selectedDeviceKey.value) {
      selectedDeviceKey.value = key;
    }
  }

  function removeDevice(id: DeviceId) {
    const key = serializeDeviceId(id);
    devices.value.delete(key);
    queue.value.delete(key);
    runningQueues.value.delete(key);

    // Si era el seleccionado, seleccionar otro
    if (selectedDeviceKey.value === key) {
      const keys = Array.from(devices.value.keys());
      selectedDeviceKey.value = keys[0] ?? null;
    }
  }

  function updateProgress(progress: ProgressUpdate) {
    // Debounce: ignorar actualizaciones muy frecuentes (excepto al finalizar)
    const ahora = Date.now();
    if (progress.remaining > 0 && ahora - ultimoProgresoTimestamp < DEBOUNCE_PROGRESO_MS) {
      return;
    }
    ultimoProgresoTimestamp = ahora;

    const key = serializeDeviceId({
      busNumber: progress.busNumber,
      address: progress.address,
    });
    const deviceQueue = queue.value.get(key);
    if (deviceQueue && deviceQueue.length > 0) {
      deviceQueue[0].progress = {
        current: progress.total - progress.remaining,
        total: progress.total,
      };
    }
  }

  async function enumerate() {
    if (isEnumerating.value) return;
    isEnumerating.value = true;

    try {
      const result = await usbService.enumerate();
      for (const dev of result) {
        addDevice(dev);
      }
      hasEnumerated.value = true;
    } catch (e) {
      lastError.value = e as Error;
      console.error("Error enumerando dispositivos:", e);
    } finally {
      isEnumerating.value = false;
    }
  }

  async function openDevice(key: string) {
    const device = devices.value.get(key);
    if (!device || device.info || device.isLoading) return;

    device.isLoading = true;
    try {
      const info = await usbService.openDevice(device.id);
      device.info = info;
    } catch (e) {
      lastError.value = e as Error;
      console.error("Error abriendo dispositivo:", e);
      throw e;
    } finally {
      device.isLoading = false;
    }
  }

  function selectDevice(key: string | null) {
    selectedDeviceKey.value = key;
  }

  function addToQueue(key: string, action: QueueAction) {
    if (!queue.value.has(key)) {
      queue.value.set(key, []);
    }
    queue.value.get(key)!.push({
      id: queueIdCounter++,
      action,
    });
    processQueue(key);
  }

  async function processQueue(key: string) {
    if (runningQueues.value.has(key)) return;

    const deviceQueue = queue.value.get(key);
    const device = devices.value.get(key);
    if (!deviceQueue || !device) return;

    runningQueues.value.add(key);

    while (deviceQueue.length > 0) {
      const item = deviceQueue[0];
      try {
        await executeQueueAction(device.id, item.action);
      } catch (e) {
        lastError.value = e as Error;
        console.error("Error en cola:", e);
      }
      deviceQueue.shift();
    }

    runningQueues.value.delete(key);
  }

  async function executeQueueAction(
    id: DeviceId,
    action: QueueAction
  ): Promise<void> {
    switch (action.type) {
      case "download": {
        const downloadPath = await usbService.getDownloadPath();
        const filename = action.path.split("/").pop() ?? "file";
        await usbService.downloadFile(id, action.path, action.size, `${downloadPath}/${filename}`);
        break;
      }
      case "upload": {
        // El archivo viene del frontend, necesitamos guardarlo primero
        // En Tauri 2.x usamos el dialogo de archivo
        await usbService.uploadFile(id, action.file.name, action.path);
        break;
      }
      case "uploadOs":
        await usbService.uploadOs(id, action.file.name);
        break;
      case "delete":
        if (action.isDir) {
          await usbService.deleteDir(id, action.path);
        } else {
          await usbService.deleteFile(id, action.path);
        }
        break;
      case "createDir":
        await usbService.createDir(id, action.path);
        break;
      case "move":
        await usbService.move(id, action.src, action.dest);
        break;
      case "copy":
        await usbService.copy(id, action.src, action.dest);
        break;
    }
  }

  // Inicializacion de listeners de eventos Tauri
  async function initEventListeners() {
    await listen<{
      busNumber: number;
      address: number;
      name: string;
      isCxIi: boolean;
      needsDrivers: boolean;
    }>("addDevice", (event) => {
      addDevice(event.payload);
    });

    await listen<{ busNumber: number; address: number }>(
      "removeDevice",
      (event) => {
        removeDevice({
          busNumber: event.payload.busNumber,
          address: event.payload.address,
        });
      }
    );

    await listen<ProgressUpdate>("progress", (event) => {
      updateProgress(event.payload);
    });
  }

  return {
    // Estado
    devices,
    selectedDeviceKey,
    isEnumerating,
    hasEnumerated,
    queue,
    lastError,
    // Getters
    deviceList,
    selectedDevice,
    selectedDeviceQueue,
    // Acciones
    addDevice,
    removeDevice,
    enumerate,
    openDevice,
    selectDevice,
    addToQueue,
    initEventListeners,
  };
});
