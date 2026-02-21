#!/usr/bin/env python3
"""
diagnose_uvicorn_import.py

Static + runtime diagnostics for:
    uvicorn main:app --host=0.0.0.0 --port=$PORT

What it reports:
1) Python files that define FastAPI() app instances
2) Syntax/import issues that can break `import main`
3) Likely circular imports in project modules
4) Concrete suggestions to fix deployment import errors
"""

from __future__ import annotations

import ast
import sys
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional


@dataclass
class FileReport:
    path: Path
    fastapi_apps: List[str] = field(default_factory=list)
    syntax_error: Optional[str] = None
    import_parse_error: Optional[str] = None
    imports: Set[str] = field(default_factory=set)


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    skip_dirs = {
        ".git",
        ".venv",
        "venv",
        "__pycache__",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        "node_modules",
    }
    return bool(parts & skip_dirs)


def module_name_from_path(root: Path, file_path: Path) -> str:
    rel = file_path.relative_to(root)
    parts = list(rel.parts)
    parts[-1] = parts[-1][:-3]
    if parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def find_fastapi_app_assignments(tree: ast.AST) -> List[str]:
    apps = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
            func = node.value.func
            is_fastapi_call = (
                (isinstance(func, ast.Name) and func.id == "FastAPI")
                or (isinstance(func, ast.Attribute) and func.attr == "FastAPI")
            )
            if is_fastapi_call:
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        apps.append(target.id)
    return apps


def extract_imports(tree: ast.AST) -> Set[str]:
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                if node.level and node.module:
                    imports.add("." * node.level + node.module)
                else:
                    imports.add(node.module)
            elif node.level:
                imports.add("." * node.level)
    return imports


def parse_python_file(path: Path) -> Tuple[Optional[ast.AST], Optional[str]]:
    try:
        src = path.read_text(encoding="utf-8")
        tree = ast.parse(src, filename=str(path))
        return tree, None
    except SyntaxError as e:
        return None, f"{e.msg} (line {e.lineno}, col {e.offset})"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def build_project_module_map(py_files: List[Path], root: Path) -> Dict[str, Path]:
    out = {}
    for f in py_files:
        out[module_name_from_path(root, f)] = f
    return out


def normalize_import_to_project_module(
    importer_module: str, raw_import: str, project_modules: Set[str]
) -> Optional[str]:
    if not raw_import.startswith("."):
        parts = raw_import.split(".")
        for i in range(len(parts), 0, -1):
            cand = ".".join(parts[:i])
            if cand in project_modules:
                return cand
        return None

    dots = len(raw_import) - len(raw_import.lstrip("."))
    suffix = raw_import[dots:]
    importer_parts = importer_module.split(".")
    if dots > len(importer_parts):
        return None
    base_parts = importer_parts[:-dots]
    if suffix:
        base_parts.extend(suffix.split("."))
    cand = ".".join(base_parts)
    if cand in project_modules:
        return cand
    if cand + ".__init__" in project_modules:
        return cand + ".__init__"
    return None


def detect_cycles(graph: Dict[str, Set[str]]) -> List[List[str]]:
    visited = set()
    stack: List[str] = []
    in_stack = set()
    cycles: List[List[str]] = []

    def dfs(node: str) -> None:
        visited.add(node)
        stack.append(node)
        in_stack.add(node)

        for nei in graph.get(node, set()):
            if nei not in visited:
                dfs(nei)
            elif nei in in_stack:
                idx = stack.index(nei)
                cycle = stack[idx:] + [nei]
                cycles.append(cycle)

        stack.pop()
        in_stack.remove(node)

    for n in graph:
        if n not in visited:
            dfs(n)

    unique = []
    seen = set()
    for c in cycles:
        core = c[:-1]
        rotations = [tuple(core[i:] + core[:i]) for i in range(len(core))]
        key = min(rotations) if rotations else tuple(core)
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def run_subprocess_import(module_name: str, cwd: Path) -> Tuple[bool, str]:
    code = (
        "import importlib, traceback\n"
        f"m='{module_name}'\n"
        "try:\n"
        "    importlib.import_module(m)\n"
        "    print('OK')\n"
        "except Exception:\n"
        "    traceback.print_exc()\n"
        "    raise\n"
    )
    try:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=20,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode == 0, out.strip()
    except Exception as e:
        return False, f"Subprocess import check failed: {type(e).__name__}: {e}"


def main() -> int:
    root = Path(".").resolve()
    py_files = [p for p in root.rglob("*.py") if not should_skip(p)]

    reports: Dict[Path, FileReport] = {}
    for f in py_files:
        fr = FileReport(path=f)
        tree, err = parse_python_file(f)
        if err:
            fr.syntax_error = err
        else:
            fr.fastapi_apps = find_fastapi_app_assignments(tree)
            try:
                fr.imports = extract_imports(tree)
            except Exception as e:
                fr.import_parse_error = f"{type(e).__name__}: {e}"
        reports[f] = fr

    module_map = build_project_module_map(py_files, root)
    project_modules = set(module_map.keys())

    graph: Dict[str, Set[str]] = defaultdict(set)
    for path, fr in reports.items():
        mod = module_name_from_path(root, path)
        graph.setdefault(mod, set())
        if fr.syntax_error:
            continue
        for raw in fr.imports:
            target = normalize_import_to_project_module(mod, raw, project_modules)
            if target:
                graph[mod].add(target)

    cycles = detect_cycles(graph)
    main_ok, main_output = run_subprocess_import("main", root)

    import_failures = {}
    for mod in sorted(project_modules):
        ok, out = run_subprocess_import(mod, root)
        if not ok:
            import_failures[mod] = out.splitlines()[-20:]

    print("=" * 80)
    print("FASTAPI IMPORT DIAGNOSTIC REPORT")
    print("=" * 80)
    print(f"Project root: {root}")
    print(f"Python files scanned: {len(py_files)}")
    print()

    print("[1] FastAPI app instances found")
    found_any = False
    for path, fr in sorted(reports.items(), key=lambda x: str(x[0])):
        if fr.fastapi_apps:
            found_any = True
            rel = path.relative_to(root)
            print(f" - {rel}: app vars = {fr.fastapi_apps}")
    if not found_any:
        print(" - None found (no `var = FastAPI(...)` assignments detected).")
    print()

    print("[2] Syntax / parse problems")
    has_syntax = False
    for path, fr in sorted(reports.items(), key=lambda x: str(x[0])):
        if fr.syntax_error or fr.import_parse_error:
            has_syntax = True
            rel = path.relative_to(root)
            print(f" - {rel}")
            if fr.syntax_error:
                print(f"    syntax_error: {fr.syntax_error}")
            if fr.import_parse_error:
                print(f"    import_parse_error: {fr.import_parse_error}")
    if not has_syntax:
        print(" - None")
    print()

    print("[3] Circular import candidates (project-local)")
    if cycles:
        for c in cycles:
            print(" - " + " -> ".join(c))
    else:
        print(" - None detected")
    print()

    print("[4] Runtime import checks")
    print(f" - import main: {'OK' if main_ok else 'FAILED'}")
    if not main_ok:
        print("   traceback tail:")
        for line in main_output.splitlines()[-25:]:
            print("   " + line)

    failed_count = len(import_failures)
    print(f" - project modules failing import: {failed_count}")
    if failed_count:
        for mod, tail in sorted(import_failures.items()):
            print(f"   * {mod}")
            for line in tail[-8:]:
                print(f"      {line}")
    print()

    print("[5] Suggestions")
    suggestions = []

    if not main_ok:
        suggestions.append(
            "Confirm deployment command matches module path: "
            "`uvicorn main:app --host 0.0.0.0 --port $PORT` "
            "and that `main.py` exists at project root."
        )
        suggestions.append("If app is inside package folder instead, use `uvicorn app.main:app ...`.")

    if has_syntax:
        suggestions.append("Fix syntax errors first; any syntax error blocks module import.")

    if cycles:
        suggestions.append(
            "Break circular imports by moving shared logic to a third module "
            "(e.g., `app/core.py`) and importing from there."
        )

    if "main" in import_failures:
        suggestions.append(
            "Inspect top-level side effects in `main.py` (file reads/env access at import-time). "
            "Move fragile startup I/O into guarded code or lazy functions."
        )

    suggestions.append(
        "Ensure all data/model files loaded by `main.py` exist in deploy artifact "
        "and path logic is robust for deployment cwd."
    )
    suggestions.append(
        "Run local smoke test with same command used in deploy: "
        "`uvicorn main:app --host 0.0.0.0 --port 8000`."
    )

    for s in suggestions:
        print(f" - {s}")

    print()
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

