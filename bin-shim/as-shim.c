#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <process.h>

int main(int argc, char** argv) {
    // Construct a call to x86_64-w64-mingw32-gcc.exe -c <args...>
    // replacing "--64" with "-m64" and "--32" with "-m32"
    
    char** new_argv = malloc((argc + 3) * sizeof(char*));
    if (!new_argv) {
        perror("malloc failed");
        return 1;
    }
    
    new_argv[0] = "C:\\Users\\mayx\\.rustup\\toolchains\\stable-x86_64-pc-windows-gnu\\lib\\rustlib\\x86_64-pc-windows-gnu\\bin\\self-contained\\x86_64-w64-mingw32-gcc.exe";
    new_argv[1] = "-c";
    
    int new_argc = 2;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--64") == 0) {
            new_argv[new_argc++] = "-m64";
        } else if (strcmp(argv[i], "--32") == 0) {
            new_argv[new_argc++] = "-m32";
        } else {
            new_argv[new_argc++] = argv[i];
        }
    }
    new_argv[new_argc] = NULL;
    
    // Execute GCC and wait for it
    intptr_t status = _spawnv(_P_WAIT, new_argv[0], (const char* const*)new_argv);
    if (status == -1) {
        perror("spawnv failed");
        return 1;
    }
    
    free(new_argv);
    return (int)status;
}
