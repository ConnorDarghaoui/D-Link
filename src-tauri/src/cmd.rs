//! Modulo de comandos USB para comunicacion con TI-Nspire.
//! Basado en n-link, adaptado para Tauri 2.x con mejoras de rendimiento.

use std::sync::Arc;
use std::time::Duration;

use libnspire::{PID, PID_CX2, VID};
use rusb::GlobalContext;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use crate::{Device, DeviceState, SerializedError, DEVICES};

/// Identificador unico de dispositivo USB
#[derive(Serialize, Deserialize, Copy, Clone, Eq, PartialEq, Debug, Hash)]
#[serde(rename_all = "camelCase")]
pub struct DeviceId {
    pub bus_number: u8,
    pub address: u8,
}

/// Payload enviado al frontend cuando se detecta un dispositivo
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AddDevicePayload {
    #[serde(flatten)]
    pub id: DeviceId,
    pub name: String,
    pub is_cx_ii: bool,
    pub needs_drivers: bool,
}

/// Actualizacion de progreso para operaciones largas
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgressUpdate {
    #[serde(flatten)]
    pub id: DeviceId,
    pub remaining: usize,
    pub total: usize,
}

/// Informacion de un archivo/directorio
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub path: String,
    pub is_dir: bool,
    pub date: u64,
    pub size: u64,
}

/// Informacion de memoria del dispositivo
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub free: u64,
    pub total: u64,
}

/// Informacion completa del dispositivo abierto
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub name: String,
    pub free_storage: u64,
    pub total_storage: u64,
    pub free_ram: u64,
    pub total_ram: u64,
    pub battery: u8,
    pub is_charging: bool,
    pub os_version: String,
    pub boot1_version: String,
    pub boot2_version: String,
    pub hw_type: u8,
    pub clock_speed: u8,
    pub lcd_width: u16,
    pub lcd_height: u16,
    pub lcd_bpp: u8,
    pub lcd_sample_mode: u8,
}

/// Intenta agregar un dispositivo USB a la lista.
/// Retorna el ID y los datos del dispositivo si es valido.
pub fn agregar_dispositivo(
    dispositivo: Arc<rusb::Device<GlobalContext>>,
) -> rusb::Result<((u8, u8), Device)> {
    let descriptor = dispositivo.device_descriptor()?;
    
    // Verificar que sea un dispositivo TI-Nspire
    if !(descriptor.vendor_id() == VID 
        && matches!(descriptor.product_id(), PID | PID_CX2)) 
    {
        return Err(rusb::Error::Other);
    }

    // Intentar abrir el dispositivo para leer el nombre
    let (nombre, necesita_drivers) = match dispositivo.open() {
        Ok(handle) => {
            let idiomas = handle.read_languages(Duration::from_millis(100))?;
            let nombre_producto = if !idiomas.is_empty() {
                handle.read_product_string(
                    idiomas[0],
                    &descriptor,
                    Duration::from_millis(100),
                )?
            } else {
                obtener_nombre_por_pid(descriptor.product_id())
            };
            (nombre_producto, false)
        }
        // En Windows sin drivers, no podemos abrir pero detectamos el dispositivo
        Err(rusb::Error::NotSupported) | Err(rusb::Error::Access) => {
            (obtener_nombre_por_pid(descriptor.product_id()), true)
        }
        Err(error) => return Err(error),
    };

    let es_cx_ii = descriptor.product_id() == PID_CX2;

    Ok((
        (dispositivo.bus_number(), dispositivo.address()),
        Device {
            nombre,
            dispositivo,
            estado: DeviceState::Closed,
            necesita_drivers,
            es_cx_ii,
        },
    ))
}

/// Obtiene el nombre del dispositivo basado en el Product ID
fn obtener_nombre_por_pid(pid: u16) -> String {
    if pid == PID_CX2 {
        "TI-Nspire CX II".to_string()
    } else {
        "TI-Nspire".to_string()
    }
}

/// Comando: enumerar todos los dispositivos TI-Nspire conectados
#[tauri::command]
pub fn enumerate(app_handle: tauri::AppHandle) -> Result<Vec<AddDevicePayload>, SerializedError> {
    let dispositivos_usb: Vec<_> = rusb::devices()?.iter().collect();
    let mut mapa = DEVICES.write().map_err(|e| e.to_string())?;

    // Eliminar dispositivos desconectados
    let claves_a_eliminar: Vec<_> = mapa
        .keys()
        .filter(|k| {
            dispositivos_usb
                .iter()
                .all(|d| d.bus_number() != k.0 || d.address() != k.1)
        })
        .cloned()
        .collect();

    for clave in claves_a_eliminar {
        mapa.remove(&clave);
        let _ = app_handle.emit(
            "removeDevice",
            DeviceId {
                bus_number: clave.0,
                address: clave.1,
            },
        );
    }

    // Filtrar dispositivos que ya conocemos
    let nuevos_dispositivos: Vec<_> = dispositivos_usb
        .into_iter()
        .filter(|d| !mapa.contains_key(&(d.bus_number(), d.address())))
        .collect();

    // Agregar nuevos dispositivos
    let resultado: Vec<AddDevicePayload> = nuevos_dispositivos
        .into_iter()
        .filter_map(|dev| agregar_dispositivo(Arc::new(dev)).ok())
        .map(|(id, datos)| {
            let payload = AddDevicePayload {
                id: DeviceId {
                    bus_number: id.0,
                    address: id.1,
                },
                name: datos.nombre.clone(),
                is_cx_ii: datos.es_cx_ii,
                needs_drivers: datos.necesita_drivers,
            };
            mapa.insert(id, datos);
            payload
        })
        .collect();

    Ok(resultado)
}
