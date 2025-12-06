/**
 * Utilidades de formateo para la aplicacion.
 * Centraliza funciones de formato para evitar duplicacion.
 */

/**
 * Formatea bytes a una representacion legible (KB, MB, GB).
 * @param bytes Cantidad de bytes
 * @returns Cadena formateada (ej: "1.5 MB")
 */
export function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formatea un timestamp a fecha legible.
 * @param timestamp Timestamp en segundos (formato TI-Nspire)
 * @returns Cadena de fecha formateada
 */
export function formatDate(timestamp: number): string {
    if (timestamp === 0) return "N/A";
    // TI-Nspire usa epoch desde 1997-01-01
    const tiEpochOffset = 852076800; // Segundos desde Unix epoch hasta TI epoch
    const date = new Date((timestamp + tiEpochOffset) * 1000);
    return date.toLocaleDateString();
}

/**
 * Formatea version de sistema operativo.
 * @param version Version como string
 * @returns Version formateada o "N/A" si esta vacia
 */
export function formatVersion(version: string): string {
    return version || "N/A";
}
