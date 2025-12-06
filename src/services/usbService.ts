/**
 * Servicio de comunicacion con Tauri para operaciones USB.
 * Encapsula todas las llamadas al backend Rust.
 */
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { DeviceId, DeviceInfo, FileInfo } from "@/types";

/** Datos de dispositivo agregado desde el backend */
interface AddDevicePayload {
  busNumber: number;
  address: number;
  name: string;
  isCxIi: boolean;
  needsDrivers: boolean;
}

/**
 * Servicio singleton para comunicacion USB via Tauri.
 */
class TauriUsbService {
  /**
   * Enumera todos los dispositivos USB conectados.
   */
  async enumerate(): Promise<AddDevicePayload[]> {
    return await invoke<AddDevicePayload[]>("enumerate");
  }

  /**
   * Abre un dispositivo para comunicacion.
   */
  async openDevice(id: DeviceId): Promise<DeviceInfo> {
    return await invoke<DeviceInfo>("open_device", {
      busNumber: id.busNumber,
      address: id.address,
    });
  }

  /**
   * Lista el contenido de un directorio.
   */
  async listDir(id: DeviceId, path: string): Promise<FileInfo[]> {
    return await invoke<FileInfo[]>("list_dir", {
      busNumber: id.busNumber,
      address: id.address,
      path,
    });
  }

  /**
   * Descarga un archivo de la calculadora.
   */
  async downloadFile(id: DeviceId, src: string, size: number, dest: string): Promise<void> {
    await invoke("download_file", {
      busNumber: id.busNumber,
      address: id.address,
      src,
      size,
      dest,
    });
  }

  /**
   * Sube un archivo a la calculadora.
   */
  async uploadFile(id: DeviceId, src: string, dest: string): Promise<void> {
    await invoke("upload_file", {
      busNumber: id.busNumber,
      address: id.address,
      src,
      dest,
    });
  }

  /**
   * Sube un archivo del sistema operativo.
   */
  async uploadOs(id: DeviceId, path: string): Promise<void> {
    await invoke("upload_os", {
      busNumber: id.busNumber,
      address: id.address,
      path,
    });
  }

  /**
   * Elimina un archivo.
   */
  async deleteFile(id: DeviceId, path: string): Promise<void> {
    await invoke("delete_file", {
      busNumber: id.busNumber,
      address: id.address,
      path,
    });
  }

  /**
   * Elimina un directorio.
   */
  async deleteDir(id: DeviceId, path: string): Promise<void> {
    await invoke("delete_dir", {
      busNumber: id.busNumber,
      address: id.address,
      path,
    });
  }

  /**
   * Crea un directorio.
   */
  async createDir(id: DeviceId, path: string): Promise<void> {
    await invoke("create_dir", {
      busNumber: id.busNumber,
      address: id.address,
      path,
    });
  }

  /**
   * Mueve un archivo o directorio.
   */
  async move(id: DeviceId, src: string, dest: string): Promise<void> {
    await invoke("move_file", {
      busNumber: id.busNumber,
      address: id.address,
      src,
      dest,
    });
  }

  /**
   * Copia un archivo o directorio.
   */
  async copy(id: DeviceId, src: string, dest: string): Promise<void> {
    await invoke("copy_file", {
      busNumber: id.busNumber,
      address: id.address,
      src,
      dest,
    });
  }

  /**
   * Obtiene la ruta de descargas del sistema.
   */
  async getDownloadPath(): Promise<string> {
    return await invoke<string>("get_download_path");
  }

  /**
   * Abre dialogo nativo para seleccionar archivos a subir.
   * Retorna las rutas absolutas de los archivos seleccionados.
   */
  async selectFilesForUpload(): Promise<string[]> {
    const result = await openDialog({
      multiple: true,
      filters: [{ name: "TNS files", extensions: ["tns"] }],
    });

    if (!result) return [];

    // openDialog retorna string | string[] | null
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Abre dialogo nativo para seleccionar archivo OS.
   */
  async selectOsFile(extension: string): Promise<string | null> {
    const result = await openDialog({
      multiple: false,
      filters: [{ name: "TI Nspire OS upgrade files", extensions: [extension] }],
    });

    if (!result) return null;
    return Array.isArray(result) ? result[0] : result;
  }
}

/** Instancia singleton del servicio */
export const usbService = new TauriUsbService();
