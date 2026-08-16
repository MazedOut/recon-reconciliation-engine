import subprocess
import json
import os
import sys

os.chdir('../frontend')
node_script = """
import('./src/data/synthetic.ts').then(m => {
    console.log(JSON.stringify(m.buildSyntheticData()));
}).catch(console.error);
"""

with open('temp_test.js', 'w') as f:
    f.write(node_script)

result = subprocess.run(['node', 'temp_test.js'], capture_output=True, text=True)
if result.returncode != 0:
    print('Node error:', result.stderr)
    sys.exit(1)

os.chdir('../backend')
sys.path.insert(0, os.getcwd())

from app.core.models import Event, ReconcileRequest
from pydantic import ValidationError

data = json.loads(result.stdout)
for event in data['events']:
    try:
        Event(**event)
    except ValidationError as e:
        print(f'Validation error in event {event[\"id\"]}: {e}')
        sys.exit(1)

try:
    ReconcileRequest(events=data['events'], injected_now=data['injected_now'])
except ValidationError as e:
    print(f'Validation error in ReconcileRequest: {e}')
    sys.exit(1)

print('ALL VALIDATION PASSED!')
