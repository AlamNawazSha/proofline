#!/usr/bin/env bash
set -euo pipefail

OUTPUT_ZIP="proofline-v0.2.0-submission.zip"
echo "Creating submission archive: ${OUTPUT_ZIP} from git HEAD..."
git archive --format=zip --output="${OUTPUT_ZIP}" HEAD

echo "Validating archive contents..."
python -c "
import zipfile, sys

with zipfile.ZipFile('${OUTPUT_ZIP}', 'r') as z:
    names = z.namelist()
    forbidden = [n for n in names if n.endswith('.env') or 'private_files/' in n or '.sqlite' in n or 'node_modules' in n or '.next' in n or n.endswith('.pem')]
    if forbidden:
        print('FAIL: Found forbidden files in zip:', forbidden)
        sys.exit(1)
    print(f'Archive validated: {len(names)} files packaged, 0 forbidden files found.')
"
