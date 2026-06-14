// En desarrollo, el sidecar lo levanta `npm run dev:all` (beforeDevCommand).
// En la app empaquetada, esta ventana arranca el binario del sidecar al
// abrirse y lo cierra al salir.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct Sidecar(Mutex<Option<CommandChild>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Sidecar(Mutex::new(None)))
        .setup(|app| {
            if !cfg!(debug_assertions) {
                let (_eventos, proceso) =
                    app.handle().shell().sidecar("ronda-sidecar")?.spawn()?;
                *app.state::<Sidecar>().0.lock().unwrap() = Some(proceso);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("no se pudo iniciar Ronda de ideas IA")
        .run(|app, evento| {
            if let tauri::RunEvent::Exit = evento {
                if let Some(proceso) = app.state::<Sidecar>().0.lock().unwrap().take() {
                    let _ = proceso.kill();
                }
                // PyInstaller "onefile" crea un proceso hijo propio: barremos
                // cualquier resto para no dejar el puerto 8765 tomado.
                #[cfg(target_os = "windows")]
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/IM", "ronda-sidecar.exe", "/T"])
                    .status();
                #[cfg(not(target_os = "windows"))]
                let _ = std::process::Command::new("pkill")
                    .args(["-f", "ronda-sidecar"])
                    .status();
            }
        });
}
