"""DRAFT: hash all original artifacts without rewriting their bytes or metadata."""
from pathlib import Path
import hashlib, json, os, platform, subprocess
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/this-girl-01'
RUNNER = OUT / 'native-runner'
RUNNER.mkdir(parents=True,exist_ok=True)
manifest_file = RUNNER / 'artifact-manifest.json'
checksum_file = RUNNER / 'artifact-manifest.sha256'
def sha(path):
    result = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024*1024), b''):
            result.update(block)
    return result.hexdigest()
def portable_references(value, pointer=''):
    refs=[]
    if isinstance(value,dict):
        for key, item in value.items():
            escaped=str(key).replace('~','~0').replace('/','~1')
            refs.extend(portable_references(item,pointer+'/'+escaped))
    elif isinstance(value,list):
        for index,item in enumerate(value):
            refs.extend(portable_references(item,pointer+'/'+str(index)))
    elif isinstance(value,str) and value.startswith(str(ROOT)+'/'):
        refs.append(dict(jsonPointer=pointer,repoRelativePath=value[len(str(ROOT))+1:]))
    return refs
files=[]
for directory in ['capture','proofs','research','native-runner']:
    folder=OUT/directory
    if not folder.exists(): continue
    for path in sorted(folder.rglob('*')):
        if not path.is_file() or path in [manifest_file,checksum_file]: continue
        # Hash originals including raw MKV, MOV backups, PCM, native f32 buffers,
        # debug logs and JSON. No copies are rewritten for portability.
        entry=dict(path=path.relative_to(ROOT).as_posix(),bytes=path.stat().st_size,sha256=sha(path))
        if path.suffix=='.json':
            try:
                refs=portable_references(json.loads(path.read_text()))
                if refs: entry['portableReferences']=refs
            except (ValueError,UnicodeError): pass
        files.append(entry)
manifest=dict(schemaVersion=1,status='runner artifacts; quality is reported separately',
              arm=os.environ.get('CAPTURE_ARM'),id=os.environ.get('CAPTURE_ID'),
              workflowRunId=os.environ.get('GITHUB_RUN_ID'),runAttempt=os.environ.get('GITHUB_RUN_ATTEMPT'),
              checkoutCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
              platform=platform.platform(),files=files,
              portability='All file paths are repository relative. portableReferences is a sidecar JSON-pointer map; original JSON bytes retain their original hashes.')
manifest_file.write_text(json.dumps(manifest,indent=2)+'\n')
checksum_file.write_text(sha(manifest_file)+'  '+manifest_file.relative_to(ROOT).as_posix()+'\n')
print('Original artifacts hashed:',len(files),'manifest:',sha(manifest_file))
