import sys
import subprocess

# Log incoming args for debugging
print(f"as-shim.py received: {sys.argv}", file=sys.stderr)

gcc_path = r"C:\Users\mayx\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained\x86_64-w64-mingw32-gcc.exe"

new_args = [gcc_path, "-c"]

for arg in sys.argv[1:]:
    if arg == "--64":
        new_args.append("-m64")
    elif arg == "--32":
        new_args.append("-m32")
    else:
        new_args.append(arg)

print(f"as-shim.py running: {new_args}", file=sys.stderr)
res = subprocess.run(new_args)
sys.exit(res.returncode)
