// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Respetar tema GTK del sistema
        std::env::set_var("GTK_THEME", std::env::var("GTK_THEME").unwrap_or_default());
    }
    
    d_link_lib::run()
}
