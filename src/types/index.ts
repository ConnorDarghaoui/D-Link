/**
 * Tipos del dominio para la aplicacion D-Link.
 * Define las estructuras de datos para dispositivos y archivos.
 */

/** Identificador unico de dispositivo USB */
export interface DeviceId {
  busNumber: number;
  address: number;
}

/** Informacion de un archivo o directorio */
export interface FileInfo {
  path: string;
  isDir: boolean;
  date: number;
  size: number;
}

/** Informacion del sistema de la calculadora */
export interface DeviceInfo {
  name: string;
  freeStorage: number;
  totalStorage: number;
  freeRam: number;
  totalRam: number;
  battery: number;
  isCharging: boolean;
  osVersion: string;
  boot1Version: string;
  boot2Version: string;
  hwType: number;
  clockSpeed: number;
  lcdWidth: number;
  lcdHeight: number;
  lcdBpp: number;
  lcdSampleMode: number;
}

/** Dispositivo conectado */
export interface Device {
  id: DeviceId;
  name: string;
  isCxII: boolean;
  needsDrivers: boolean;
  info: DeviceInfo | null;
  isLoading: boolean;
}

/** Accion de la cola de operaciones */
export type QueueAction =
  | { type: "download"; path: string; size: number }
  | { type: "upload"; path: string; file: File }
  | { type: "uploadOs"; file: File }
  | { type: "delete"; path: string; isDir: boolean }
  | { type: "createDir"; path: string }
  | { type: "move"; src: string; dest: string }
  | { type: "copy"; src: string; dest: string };

/** Elemento en la cola con progreso */
export interface QueueItem {
  id: number;
  action: QueueAction;
  progress?: {
    current: number;
    total: number;
  };
}

/** Estado de progreso de una operacion */
export interface ProgressUpdate {
  busNumber: number;
  address: number;
  remaining: number;
  total: number;
}

/** Serializador de DeviceId para uso como clave */
export function serializeDeviceId(id: DeviceId): string {
  return `${id.busNumber}-${id.address}`;
}

/** Deserializador de DeviceId desde clave */
export function deserializeDeviceId(key: string): DeviceId {
  const [busNumber, address] = key.split("-").map(Number);
  return { busNumber, address };
}
