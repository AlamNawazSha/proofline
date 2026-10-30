#!/usr/bin/env python3
"""Cross-platform packaging script for Proofline submission archive."""
import subprocess
import sys
import zipfile
from pathlib import Path

OUTPUT_ZIP = "proofline-v0.2.0-submission.zip"

def main():
    print(f"Creating submission archive: {OUTPUT_ZIP} from git HEAD...")
    cmd = ["git", "archive", "--format=zip", f"--output={OUTPUT_ZIP}", "HEAD"]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print("Error: git archive failed", file=sys.stderr)
        sys.exit(res.returncode)

    print("Validating archive contents...")
    with zipfile.ZipFile(OUTPUT_ZIP, "r") as z:
        names = z.namelist()
        forbidden = [
            n for n in names
            if n.endswith(".env")
            or "private_files/" in n
            or ".sqlite" in n
            or "node_modules" in n
            or ".next" in n
            or n.endswith(".pem")
        ]
        if forbidden:
            print("FAIL: Found forbidden files in zip:", forbidden, file=sys.stderr)
            sys.exit(1)
        print(f"Archive validated: {len(names)} files packaged, 0 forbidden files found.")

if __name__ == "__main__":
    main()
