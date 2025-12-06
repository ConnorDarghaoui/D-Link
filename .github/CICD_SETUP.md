# Configuracion de CI/CD para D-Link

## Secretos de GitHub Requeridos

Para habilitar la firma de codigo y notarizacion, configura los siguientes secretos en GitHub:

### Windows (Firma de codigo)

| Secreto | Descripcion |
|---------|-------------|
| `WINDOWS_CERTIFICATE` | Certificado PFX en base64 |
| `WINDOWS_CERTIFICATE_PASSWORD` | Contrasena del certificado |

**Como generar:**
```bash
# Convertir PFX a base64
base64 -i certificate.pfx -o certificate.txt
# Copiar contenido de certificate.txt al secreto
```

### macOS (Firma y Notarizacion)

| Secreto | Descripcion |
|---------|-------------|
| `APPLE_CERTIFICATE` | Certificado P12 en base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Contrasena del certificado |
| `APPLE_SIGNING_IDENTITY` | Identidad de firma (ej: "Developer ID Application: Tu Nombre") |
| `APPLE_ID` | Tu Apple ID para notarizacion |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | ID del equipo de Apple Developer |
| `KEYCHAIN_PASSWORD` | Contrasena temporal para el keychain |

**Como generar App-Specific Password:**
1. Ve a https://appleid.apple.com
2. Seguridad > App-Specific Passwords
3. Genera una nueva contrasena

### Tauri Update (Opcional)

| Secreto | Descripcion |
|---------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Clave privada para firmar actualizaciones |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Contrasena de la clave |

## Artefactos Generados

### Windows
- `d-link_x.x.x_x64-setup.exe` - Instalador NSIS
- `d-link_x.x.x_x64.msi` - Instalador MSI

### Linux
- `d-link_x.x.x_amd64.deb` - Debian/Ubuntu
- `d-link-x.x.x-1.x86_64.rpm` - Fedora/RHEL
- `d-link_x.x.x_amd64.AppImage` - Universal

### macOS
- `d-link_x.x.x_x64.dmg` - Intel Mac
- `d-link_x.x.x_aarch64.dmg` - Apple Silicon

## Ejecucion Manual

Puedes ejecutar el workflow manualmente desde:
1. GitHub > Actions > Build and Release
2. Click "Run workflow"
3. Selecciona si quieres draft o publicar directamente

## Sin Firma de Codigo

El workflow funciona sin firma de codigo, pero:
- **Windows**: Mostrara advertencia de SmartScreen
- **macOS**: Los usuarios tendran que permitir manualmente en "Seguridad y Privacidad"
