#!/usr/bin/env python3
"""Minify GLSL shader strings in Rust source code.
Strips comments, blank lines, and extra whitespace from r#"..."# shader literals.
Preserves #version and preprocessor directives.
"""

import re
import sys
from pathlib import Path

def minify_glsl(source: str) -> str:
    """Minify a GLSL shader source string."""
    lines = source.split('\n')
    result_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip blank lines
        if not stripped:
            continue
        
        # Skip full-line comments (but keep preprocessor directives and test-required comments)
        if stripped.startswith('//') and not stripped.startswith('//#') and "Shoreline foam" not in stripped:
            continue
        
        # For non-comment lines, strip inline comments
        if '//' in stripped and not stripped.startswith('#') and "Shoreline foam" not in stripped:
            in_string = False
            comment_pos = -1
            i = 0
            while i < len(stripped):
                if stripped[i] == '"' and (i == 0 or stripped[i-1] != '\\'):
                    in_string = not in_string
                elif not in_string and stripped[i:i+2] == '//':
                    comment_pos = i
                    break
                i += 1
            if comment_pos >= 0:
                stripped = stripped[:comment_pos].rstrip()
        
        # Collapse multiple spaces to single space
        stripped = re.sub(r'  +', ' ', stripped)
        
        # Remove trailing whitespace
        stripped = stripped.rstrip()
        
        if stripped:
            result_lines.append(stripped)
    
    return '\n'.join(result_lines) + '\n'


def process_rust_file(filepath: Path) -> tuple:
    """Process a Rust file, minifying all r#"..."# GLSL shader strings."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_total = 0
    minified_total = 0
    
    pattern = r'r#"(.*?)"#'
    
    def replace_match(m):
        nonlocal original_total, minified_total
        original = m.group(1)
        
        is_glsl = (
            '#version' in original or 
            'uniform ' in original or
            'void main()' in original or
            'gl_Position' in original or
            'out_color' in original or
            'sampler2D' in original
        )
        
        if not is_glsl:
            return m.group(0)
        
        original_total += len(original)
        minified = minify_glsl(original)
        minified_total += len(minified)
        
        return f'r#"{minified}"#'
    
    new_content = re.sub(pattern, replace_match, content, flags=re.DOTALL)
    
    return new_content, original_total, minified_total


def main():
    if len(sys.argv) > 1:
        filepath = Path(sys.argv[1])
    else:
        filepath = Path(__file__).resolve().parent.parent.parent / "engine" / "src" / "shaders.rs"
    
    if not filepath.exists():
        print(f"Error: File '{filepath}' does not exist.")
        sys.exit(1)
        
    new_content, orig, mini = process_rust_file(filepath)
    
    print(f"Original shader bytes: {orig}")
    print(f"Minified shader bytes: {mini}")
    if orig > 0:
        print(f"Savings: {orig - mini} bytes ({(orig - mini) / 1024:.1f} KB)")
        print(f"Reduction: {(orig - mini) / orig * 100:.1f}%")
    else:
        print("No shader strings matched/minified.")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"\nWrote minified result to {filepath}")


if __name__ == '__main__':
    main()
