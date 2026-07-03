use std::env;
use std::fs;
use std::process::Command;
use std::path::Path;

fn main() {
    let args: Vec<String> = env::args().collect();
    
    // Optional: log calls for auditing
    let log_path = r"c:\Users\mayx\code\s4wn\as_calls.txt";
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(log_path) {
        use std::io::Write;
        let _ = writeln!(file, "--- Call ---");
        for arg in &args {
            let _ = writeln!(file, "{}", arg);
        }
    }
    
    let mut input_file = None;
    let mut output_file = None;
    
    let mut i = 1;
    while i < args.len() {
        if args[i] == "-o" && i + 1 < args.len() {
            output_file = Some(&args[i + 1]);
            i += 2;
        } else if args[i].starts_with("-") {
            // Skip other flags
            i += 1;
        } else {
            input_file = Some(&args[i]);
            i += 1;
        }
    }
    
    if let (Some(input), Some(output)) = (input_file, output_file) {
        let input_path = Path::new(input);
        let absolute_input = if input_path.is_absolute() {
            input_path.to_path_buf()
        } else {
            env::current_dir().unwrap().join(input_path)
        };
        
        let input_str = absolute_input.to_string_lossy().replace('\\', "/");
        
        let output_path = Path::new(output);
        let absolute_output = if output_path.is_absolute() {
            output_path.to_path_buf()
        } else {
            env::current_dir().unwrap().join(output_path)
        };
        
        let output_dir = absolute_output.parent().unwrap();
        let stem = absolute_output.file_stem().unwrap().to_string_lossy();
        
        // Sanitize crate name: only allow alphanumeric and underscores
        let stem_sanitized: String = stem.chars()
            .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
            .collect();
            
        let wrapper_path = output_dir.join(format!("{}_wrapper.rs", stem_sanitized));
        
        let wrapper_code = format!(
            "core::arch::global_asm!(include_str!(\"{}\"));\n",
            input_str
        );
        
        if let Err(e) = fs::write(&wrapper_path, wrapper_code) {
            eprintln!("as-shim error: failed to write wrapper file: {:?}", e);
            std::process::exit(1);
        }
        
        let rustc = r"C:\Users\mayx\.rustup\toolchains\stable-x86_64-pc-windows-gnu\bin\rustc.exe";
        let status = Command::new(rustc)
            .arg("--target=x86_64-pc-windows-gnu")
            .arg("--emit=obj")
            .arg("--crate-type=lib")
            .arg("--crate-name")
            .arg(&format!("{}_wrapper", stem_sanitized))
            .arg("-o")
            .arg(&absolute_output)
            .arg(&wrapper_path)
            .status();
            
        let _ = fs::remove_file(&wrapper_path);
        
        match status {
            Ok(stat) => {
                if stat.success() {
                    std::process::exit(0);
                } else {
                    eprintln!("as-shim error: rustc failed with status {:?}", stat);
                    std::process::exit(stat.code().unwrap_or(1));
                }
            }
            Err(e) => {
                eprintln!("as-shim error: failed to execute rustc: {:?}", e);
                std::process::exit(1);
            }
        }
    } else {
        eprintln!("as-shim error: missing input or output file in args {:?}", args);
        std::process::exit(1);
    }
}
