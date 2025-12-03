/**
 * Servicio de comunicacion con Tauri para operaciones USB.
 * Encapsula todas las llamadas al backend Rust.
 */
import { invoke } from "@tauri-apps/api/core";
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
   * Abre un dialogo para seleccionar archivos.
   */
  async selectFiles(
    multiple: boolean,
    filters?: { name: string; extensions: string[] }[]
  ): Promise<string[] | null> {
    return await invoke<string[] | null>("select_files", {
      multiple,
      filters,
    });
  }

  /**
   * Abre un dialogo para guardar archivo.
   */
  async selectSavePath(defaultName: string): Promise<string | null> {
    return await invoke<string | null>("select_save_path", {
      defaultName,
    });
  }
}

/** Instancia singleton del servicio */
export const usbService = new TauriUsbService();
