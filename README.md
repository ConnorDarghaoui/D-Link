# D-Link

Aplicacion de escritorio para conectar y administrar calculadoras **TI-Nspire** via USB.

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri)
![Vue](https://img.shields.io/badge/Vue-3-green?logo=vue.js)
![Rust](https://img.shields.io/badge/Rust-backend-orange?logo=rust)
![License](https://img.shields.io/badge/License-GPL%20v3-blue)

## Caracteristicas

- Deteccion automatica de dispositivos USB (hotplug)
- Explorador de archivos integrado
- Subir/descargar archivos a la calculadora
- Actualizar sistema operativo
- Crear/eliminar carpetas
- Cola de operaciones con progreso en tiempo real
- Interfaz minimalista y rapida

## Requisitos

- **Linux**: `libusb-1.0-0-dev`
- **Windows**: Driver WinUSB (ver instrucciones abajo)
- **macOS**: Sin requisitos adicionales

## Instalacion

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/d-link.git
cd d-link

# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm tauri dev

# Compilar para produccion
pnpm tauri build
```

## Estructura del Proyecto

```
d-link/
├── src/                  # Frontend Vue 3
│   ├── components/       # Componentes UI
│   ├── stores/           # Estados Pinia
│   ├── services/         # Servicios USB
│   └── types/            # Tipos TypeScript
├── src-tauri/            # Backend Rust
│   └── src/
│       ├── lib.rs        # Logica USB y comandos
│       └── cmd.rs        # Estructuras de datos
└── index.html
```

## Windows: Instalacion de Drivers

En Windows necesitas instalar el driver WinUSB:

1. Descarga [Zadig](https://zadig.akeo.ie/)
2. Conecta tu TI-Nspire
3. En Zadig, selecciona tu calculadora
4. Instala el driver **WinUSB**

## Creditos

- **D-Link** - Lucas Boniche
- Basado en [N-Link](https://lights0123.com/n-link/) por Ben Schattinger
- Usa [libnspire](https://github.com/lights0123/libnspire) para comunicacion USB

## Licencia

GPL v3.0 - Ver [LICENSE](LICENSE) para mas detalles.
