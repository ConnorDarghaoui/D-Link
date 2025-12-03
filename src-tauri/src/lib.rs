//! Biblioteca principal de D-Link para Tauri 2.x.
//! Implementa la comunicacion USB con calculadoras TI-Nspire.
//! 
//! Basado en n-link, con mejoras de arquitectura y compatibilidad multiplataforma.

#![allow(clippy::type_complexity)]

use std::fs::File;
use std::io::{BufWriter, Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use std::time::Duration;

use hashbrown::HashMap;
use libnspire::dir::EntryType;
use libnspire::{PID_CX2, VID};
use rusb::{GlobalContext, Hotplug, UsbContext};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub mod cmd;

use cmd::{agregar_dispositivo, AddDevicePayload, DeviceId, FileInfo, DeviceInfo, ProgressUpdate};

// Estado global de dispositivos conectados
lazy_static::lazy_static! {
    pub static ref DEVICES: RwLock<HashMap<(u8, u8), Device>> = RwLock::new(HashMap::new());
}

/// Convierte un Info de libnspire a nuestro DeviceInfo
fn convertir_info(info: &libnspire::info::Info) -> DeviceInfo {
    use libnspire::info::{Battery, HardwareType};
    
    // El enum Battery no representa porcentaje real, solo estados
    // Powered = conectado a corriente, Ok = bateria bien, Low = bateria baja
    let battery_percent = match info.battery {
        Battery::Powered => 100,
        Battery::Ok => 80,
        Battery::Low => 20,
        Battery::Unknown(_) => 50, // Valor desconocido, usar 50% por defecto
    };
    
    let hw_type_num = match info.hw_type {
        HardwareType::Cas => 0,
        HardwareType::NonCas => 1,
        HardwareType::CasCx => 2,
        HardwareType::NonCasCx => 3,
        HardwareType::Unknown(v) => v,
    };
    
    DeviceInfo {
        name: info.name.clone(),
        free_storage: info.free_storage,
        total_storage: info.total_storage,
        free_ram: info.free_ram,
        total_ram: info.total_ram,
        battery: battery_percent,
        is_charging: info.is_charging,
        os_version: info.version.to_string(),
        boot1_version: info.boot1_version.to_string(),
        boot2_version: info.boot2_version.to_string(),
        hw_type: hw_type_num,
        clock_speed: info.clock_speed,
        lcd_width: info.lcd.width,
        lcd_height: info.lcd.height,
        lcd_bpp: info.lcd.bpp,
        lcd_sample_mode: info.lcd.sample_mode,
    }
}

/// Estado de conexion del dispositivo
pub enum DeviceState {
    Open(
        Arc<Mutex<libnspire::Handle<GlobalContext>>>,
        libnspire::info::Info,
    ),
    Closed,
}

/// Datos de un dispositivo TI-Nspire
pub struct Device {
    pub nombre: String,
    pub dispositivo: Arc<rusb::Device<GlobalContext>>,
    pub estado: DeviceState,
    pub necesita_drivers: bool,
    pub es_cx_ii: bool,
}

/// Error serializable para enviar al frontend
#[derive(Debug, Serialize)]
pub struct SerializedError(String);

impl<T: std::fmt::Display> From<T> for SerializedError {
    fn from(error: T) -> Self {
        SerializedError(error.to_string())
    }
}

/// Monitor de conexion/desconexion USB (Hotplug)
struct MonitorDispositivos {
    app_handle: AppHandle,
}

impl Hotplug<GlobalContext> for MonitorDispositivos {
    fn device_arrived(&mut self, dispositivo: rusb::Device<GlobalContext>) {
        let handle = self.app_handle.clone();
        let es_cx_ii = dispositivo
            .device_descriptor()
            .map(|d| d.product_id() == PID_CX2)
            .unwrap_or(false);
        let dispositivo = Arc::new(dispositivo);

        // Procesar en hilo separado para no bloquear el callback
        std::thread::spawn(move || {
            // Reintentar si el dispositivo esta ocupado
            for _ in 0..10 {
                match agregar_dispositivo(dispositivo.clone()) {
                    Ok((id, datos)) => {
                        let nombre = datos.nombre.clone();
                        let necesita_drivers = datos.necesita_drivers;
                        
                        if let Ok(mut mapa) = DEVICES.write() {
                            mapa.insert(id, datos);
                        }

                        let _ = handle.emit(
                            "addDevice",
                            AddDevicePayload {
                                id: DeviceId {
                                    bus_number: id.0,
                                    address: id.1,
                                },
                                name: nombre,
                                is_cx_ii: es_cx_ii,
                                needs_drivers: necesita_drivers,
                            },
                        );
                        return;
                    }
                    Err(rusb::Error::Busy) => {
                        std::thread::sleep(Duration::from_millis(250));
                    }
                    Err(e) => {
                        eprintln!("Error agregando dispositivo: {}", e);
                        return;
                    }
                }
            }
        });
    }

    fn device_left(&mut self, dispositivo: rusb::Device<GlobalContext>) {
        let clave = (dispositivo.bus_number(), dispositivo.address());
        
        if let Ok(mut mapa) = DEVICES.write() {
            if mapa.remove(&clave).is_some() {
                let _ = self.app_handle.emit(
                    "removeDevice",
                    DeviceId {
                        bus_number: clave.0,
                        address: clave.1,
                    },
                );
            }
        }
    }
}

/// Obtiene el handle de un dispositivo abierto
fn obtener_dispositivo_abierto(
    id: &DeviceId,
) -> Result<Arc<Mutex<libnspire::Handle<GlobalContext>>>, anyhow::Error> {
    let mapa = DEVICES.read().map_err(|e| anyhow::anyhow!("{}", e))?;
    
    if let Some(dispositivo) = mapa.get(&(id.bus_number, id.address)) {
        match &dispositivo.estado {
            DeviceState::Open(handle, _) => Ok(handle.clone()),
            DeviceState::Closed => anyhow::bail!("Dispositivo cerrado"),
        }
    } else {
        anyhow::bail!("Dispositivo no encontrado")
    }
}

/// Envuelve errores y maneja desconexiones automaticamente
fn envolver_error<T>(
    resultado: Result<T, libnspire::Error>,
    id: DeviceId,
    app_handle: &AppHandle,
) -> Result<T, libnspire::Error> {
    if let Err(libnspire::Error::NoDevice) = resultado {
        if let Ok(mut mapa) = DEVICES.write() {
            mapa.remove(&(id.bus_number, id.address));
        }
        let _ = app_handle.emit("removeDevice", id);
    }
    resultado
}

/// Crea un callback para reportar progreso de operaciones
/// Optimizado: reporta solo cuando hay un cambio significativo (>=1% o al finalizar)
fn crear_reporter_progreso(
    app_handle: &AppHandle,
    id: DeviceId,
    total: usize,
) -> impl FnMut(usize) + '_ {
    let umbral = (total / 100).max(1); // 1% del total, minimo 1 byte
    let mut ultimo_reportado = total;
    
    move |restante| {
        let diferencia = ultimo_reportado.saturating_sub(restante);
        
        // Reportar si hay cambio >= 1% o si es el final
        if diferencia >= umbral || restante == 0 {
            ultimo_reportado = restante;
            let _ = app_handle.emit(
                "progress",
                ProgressUpdate {
                    id,
                    remaining: restante,
                    total,
                },
            );
        }
    }
}

// ============================================================================
// COMANDOS TAURI
// ============================================================================

/// Abre un dispositivo para comunicacion
#[tauri::command]
fn open_device(bus_number: u8, address: u8) -> Result<DeviceInfo, SerializedError> {
    let dispositivo_usb = {
        let mapa = DEVICES.read().map_err(|e| e.to_string())?;
        let dispositivo = mapa
            .get(&(bus_number, address))
            .ok_or("Dispositivo no encontrado")?;
        
        if !matches!(dispositivo.estado, DeviceState::Closed) {
            return Err("El dispositivo ya esta abierto".into());
        }
        
        dispositivo.dispositivo.clone()
    };

    // Abrir conexion con la calculadora
    let handle = libnspire::Handle::new(dispositivo_usb.open()?)?;
    let info = handle.info()?;

    // Guardar el handle abierto
    {
        let mut mapa = DEVICES.write().map_err(|e| e.to_string())?;
        let dispositivo = mapa
            .get_mut(&(bus_number, address))
            .ok_or("Dispositivo perdido durante apertura")?;
        
        dispositivo.estado = DeviceState::Open(
            Arc::new(Mutex::new(handle)), 
            info.clone()
        );
    }

    // Convertir info de libnspire a nuestro formato
    Ok(convertir_info(&info))
}

/// Cierra la conexion con un dispositivo
#[tauri::command]
fn close_device(bus_number: u8, address: u8) -> Result<(), SerializedError> {
    let mut mapa = DEVICES.write().map_err(|e| e.to_string())?;
    let dispositivo = mapa
        .get_mut(&(bus_number, address))
        .ok_or("Dispositivo no encontrado")?;
    
    dispositivo.estado = DeviceState::Closed;
    Ok(())
}

/// Actualiza la informacion del dispositivo
#[tauri::command]
fn update_device(
    bus_number: u8,
    address: u8,
    app_handle: AppHandle,
) -> Result<DeviceInfo, SerializedError> {
    let id = DeviceId { bus_number, address };
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;
    
    let info = envolver_error(handle.info(), id, &app_handle)?;
    
    Ok(convertir_info(&info))
}

/// Lista el contenido de un directorio
#[tauri::command]
fn list_dir(
    bus_number: u8,
    address: u8,
    path: String,
    app_handle: AppHandle,
) -> Result<Vec<FileInfo>, SerializedError> {
    let id = DeviceId { bus_number, address };
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    let directorio = envolver_error(handle.list_dir(&path), id, &app_handle)?;

    Ok(directorio
        .iter()
        .map(|archivo| FileInfo {
            path: archivo.name().to_string_lossy().to_string(),
            is_dir: archivo.entry_type() == EntryType::Directory,
            date: archivo.date(),
            size: archivo.size(),
        })
        .collect())
}

/// Descarga un archivo de la calculadora
#[tauri::command]
fn download_file(
    bus_number: u8,
    address: u8,
    src: String,
    size: u64,
    dest: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    let ruta_destino = PathBuf::from(dest);
    
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    let mut buffer = vec![0u8; size as usize];
    envolver_error(
        handle.read_file(
            &src,
            &mut buffer,
            &mut crear_reporter_progreso(&app_handle, id, size as usize),
        ),
        id,
        &app_handle,
    )?;

    // Guardar en disco con buffer para mejor rendimiento
    if let Some(nombre) = src.split('/').last() {
        let archivo = File::create(ruta_destino.join(nombre))?;
        let mut escritor = BufWriter::with_capacity(64 * 1024, archivo); // 64KB buffer
        escritor.write_all(&buffer)?;
        escritor.flush()?;
    }

    Ok(())
}

/// Sube un archivo a la calculadora
#[tauri::command]
fn upload_file(
    bus_number: u8,
    address: u8,
    src: String,
    dest: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    let ruta_origen = PathBuf::from(&src);

    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    let mut buffer = vec![];
    File::open(&ruta_origen)?.read_to_end(&mut buffer)?;

    let nombre_archivo = ruta_origen
        .file_name()
        .ok_or("No se pudo obtener el nombre del archivo")?
        .to_string_lossy()
        .to_string();

    let ruta_completa = format!("{}/{}", dest, nombre_archivo);

    envolver_error(
        handle.write_file(
            &ruta_completa,
            &buffer,
            &mut crear_reporter_progreso(&app_handle, id, buffer.len()),
        ),
        id,
        &app_handle,
    )?;

    Ok(())
}

/// Sube un archivo de sistema operativo
#[tauri::command]
fn upload_os(
    bus_number: u8,
    address: u8,
    src: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };

    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    let mut buffer = vec![];
    File::open(&src)?.read_to_end(&mut buffer)?;

    envolver_error(
        handle.send_os(
            &buffer,
            &mut crear_reporter_progreso(&app_handle, id, buffer.len()),
        ),
        id,
        &app_handle,
    )?;

    Ok(())
}

/// Elimina un archivo
#[tauri::command]
fn delete_file(
    bus_number: u8,
    address: u8,
    path: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    envolver_error(handle.delete_file(&path), id, &app_handle)?;
    Ok(())
}

/// Elimina un directorio
#[tauri::command]
fn delete_dir(
    bus_number: u8,
    address: u8,
    path: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    envolver_error(handle.delete_dir(&path), id, &app_handle)?;
    Ok(())
}

/// Crea un directorio
#[tauri::command]
fn create_dir(
    bus_number: u8,
    address: u8,
    path: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    envolver_error(handle.create_dir(&path), id, &app_handle)?;
    Ok(())
}

/// Mueve un archivo o directorio
#[tauri::command]
fn move_file(
    bus_number: u8,
    address: u8,
    src: String,
    dest: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    envolver_error(handle.move_file(&src, &dest), id, &app_handle)?;
    Ok(())
}

/// Copia un archivo o directorio
#[tauri::command]
fn copy_file(
    bus_number: u8,
    address: u8,
    src: String,
    dest: String,
    app_handle: AppHandle,
) -> Result<(), SerializedError> {
    let id = DeviceId { bus_number, address };
    
    let handle = obtener_dispositivo_abierto(&id)?;
    let handle = handle.lock().map_err(|e| e.to_string())?;

    envolver_error(handle.copy_file(&src, &dest), id, &app_handle)?;
    Ok(())
}

/// Obtiene la ruta de descargas del sistema
#[tauri::command]
fn get_download_path() -> Result<String, SerializedError> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "No se pudo obtener el directorio de descargas".into())
}

// ============================================================================
// PUNTO DE ENTRADA
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let hotplug_registrado = AtomicBool::new(false);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // Registrar hotplug USB si esta disponible
            if !hotplug_registrado.swap(true, Ordering::SeqCst) {
                let app_handle = app.handle().clone();
                
                if rusb::has_hotplug() {
                    let monitor = MonitorDispositivos { 
                        app_handle: app_handle.clone() 
                    };
                    
                    match GlobalContext::default().register_callback(
                        Some(VID),
                        None,
                        None,
                        Box::new(monitor),
                    ) {
                        Ok(_registration) => {
                            // Iniciar hilo de procesamiento de eventos USB
                            std::thread::spawn(|| loop {
                                if let Err(e) = GlobalContext::default().handle_events(None) {
                                    eprintln!("Error procesando eventos USB: {}", e);
                                    std::thread::sleep(Duration::from_secs(1));
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("No se pudo registrar hotplug USB: {}", e);
                        }
                    }
                } else {
                    println!("Sistema sin soporte hotplug USB - se requiere enumeracion manual");
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::enumerate,
            open_device,
            close_device,
            update_device,
            list_dir,
            download_file,
            upload_file,
            upload_os,
            delete_file,
            delete_dir,
            create_dir,
            move_file,
            copy_file,
            get_download_path,
        ])
        .run(tauri::generate_context!())
        .expect("Error iniciando aplicacion D-Link");
}

