/**
 * Constantes de configuracion de la aplicacion.
 * Centraliza valores magicos para facilitar mantenimiento y ajustes.
 */

// Cache de directorios
export const CACHE_TTL_MS = 30_000; // 30 segundos

// Debounce de progreso (evita re-renders excesivos)
export const PROGRESS_DEBOUNCE_MS = 50;

// Intervalos de limpieza
export const CACHE_CLEANUP_INTERVAL_MS = 60_000; // 1 minuto

// Delays de operaciones
export const DEVICE_DETECTION_DELAY_MS = 500;
export const REFRESH_AFTER_OPERATION_MS = 500;

// Limites de UI
export const MAX_BREADCRUMB_WIDTH = 128; // px
