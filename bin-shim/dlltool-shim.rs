use std::env;
use std::process::Command;

fn main() {
    let args: Vec<String> = env::args().collect();
    
    let mut def_file = None;
    let mut lib_file = None;
    
    let mut i = 1;
    while i < args.len() {
        if args[i] == "-d" && i + 1 < args.len() {
            def_file = Some(&args[i + 1]);
            i += 2;
        } else if args[i] == "-l" && i + 1 < args.len() {
            lib_file = Some(&args[i + 1]);
            i += 2;
        } else {
            i += 1;
        }
    }
    
    if let (Some(def), Some(lib)) = (def_file, lib_file) {
        let lld_link = r"C:\Users\mayx\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\gcc-ld\lld-link.exe";
        
        let output = Command::new(lld_link)
            .arg("/lib")
            .arg(format!("/def:{}", def))
            .arg(format!("/out:{}", lib))
            .arg("/machine:x64")
            .output();
            
        match output {
            Ok(out) => {
                if out.status.success() {
                    std::process::exit(0);
                } else {
                    eprintln!("dlltool-shim error: lld-link failed with status {:?}", out.status);
                    eprintln!("stdout: {}", String::from_utf8_lossy(&out.stdout));
                    eprintln!("stderr: {}", String::from_utf8_lossy(&out.stderr));
                    std::process::exit(out.status.code().unwrap_or(1));
                }
            }
            Err(e) => {
                eprintln!("dlltool-shim error: failed to execute lld-link: {:?}", e);
                std::process::exit(1);
            }
        }
    } else {
        std::process::exit(1);
    }
}
