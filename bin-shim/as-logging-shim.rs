use std::env;
use std::fs::OpenOptions;
use std::io::Write;

fn main() {
    let args: Vec<String> = env::args().collect();
    let log_path = r"c:\Users\mayx\code\s4wn\as_calls.txt";
    
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "--- Call ---");
        for arg in &args {
            let _ = writeln!(file, "{}", arg);
        }
    }
    
    eprintln!("as-logging-shim called with: {:?}", args);
    // Exit with 0 to let dlltool think it succeeded (for now)
    std::process::exit(0);
}
