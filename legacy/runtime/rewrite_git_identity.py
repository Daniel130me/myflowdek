import os
import subprocess
import sys
from pathlib import Path

repo = Path(r"C:\Users\HP\Desktop\flowdeck")
mailmap = repo / "mailmap.txt"
mailmap.write_text("Daniel130me <kosokodaniel@gmail.com> Z User <z@container>\n", encoding="utf-8")

subprocess.run([sys.executable, "-m", "git_filter_repo", "--mailmap", str(mailmap), "--force"], cwd=repo, check=True)

result = subprocess.run(
    ["git", "log", "--all", "--format=%H%x09%an <%ae> %cn <%ce>"],
    cwd=repo,
    capture_output=True,
    text=True,
    check=True,
)

matches = [line for line in result.stdout.splitlines() if "Daniel130me" in line or "kosokodaniel@gmail.com" in line]
print("\n".join(matches[:10]))
