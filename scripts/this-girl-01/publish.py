"""Publish only the checked media to its dedicated GitHub branch.

The source/game branch, main, tags and itch.io are never updated here.
Large Git objects live in /tmp, outside the space-constrained common object store.
"""
from pathlib import Path
import argparse, hashlib, json, os, subprocess, tempfile, urllib.parse, urllib.request
from package import ROOT, D, R, REPO, sha, check, write

BRANCH = 'downloads/this-girl-01'


def command(args, env=None, text=True, data=None):
    return subprocess.check_output(args, cwd=ROOT, env=env, text=text, input=data).strip()


def publish(push=False):
    manifest = check()
    assert manifest['mediaBranch'] == BRANCH
    names = manifest['publicFiles']
    if not push:
        print('CHECK ONLY: ready for dedicated media branch; pass --push to publish.')
        return
    old = command(['git', 'ls-remote', '--heads', 'origin', 'refs/heads/' + BRANCH])
    old = old.split()[0] if old else ''
    with tempfile.TemporaryDirectory(prefix='this-girl-media-git-', dir='/tmp') as area:
        area = Path(area)
        objects = area / 'objects'
        objects.mkdir()
        common = command(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'])
        env = dict(os.environ, GIT_OBJECT_DIRECTORY=str(objects),
                   GIT_ALTERNATE_OBJECT_DIRECTORIES=str(Path(common) / 'objects'),
                   GIT_INDEX_FILE=str(area / 'index'))
        if old:
            command(['git', 'fetch', '--no-tags', 'origin', 'refs/heads/' + BRANCH], env)
        command(['git', 'read-tree', '--empty'], env)
        for name in names:
            p = D / name
            blob = command(['git', 'hash-object', '-w', '--', str(p)], env)
            command(['git', 'update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + name], env)
        tree = command(['git', 'write-tree'], env)
        args = ['git', 'commit-tree', tree]
        if old:
            args += ['-p', old]
        commit = command(args, env, data='media: この子で、勝ちたい。 #01 — checked research episode\n')
        # Ref-specific lease: reject a concurrent change rather than overwrite it.
        command(['git', 'push', '--force-with-lease=refs/heads/' + BRANCH + ':' + old,
                 'origin', commit + ':refs/heads/' + BRANCH], env)
        remote = command(['git', 'ls-remote', '--heads', 'origin', 'refs/heads/' + BRANCH]).split()[0]
        assert remote == commit
    # Read back exact committed bytes, streaming hashes without keeping duplicates.
    receipts = []
    for name in names:
        url = f'https://raw.githubusercontent.com/{REPO}/{commit}/' + urllib.parse.quote(name)
        digest = hashlib.sha256()
        size = 0
        request = urllib.request.Request(url, headers={'User-Agent': 'STILLVEIL-media-verification'})
        with urllib.request.urlopen(request, timeout=120) as response:
            while block := response.read(1024 * 1024):
                digest.update(block)
                size += len(block)
        p = D / name
        assert size == p.stat().st_size and digest.hexdigest() == sha(p), ('Remote bytes differ', name)
        receipts.append({'file': name, 'url': url, 'bytes': size, 'sha256': digest.hexdigest()})
        print('REMOTE SHA VERIFIED', name, flush=True)
    write(R / 'github-publication.json', {'passed': True, 'branch': BRANCH, 'commit': commit,
          'finishedSha256': manifest['finishedSha256'], 'files': receipts,
          'gameDeployment': 'none; main and itch.io unchanged'})
    print('PUBLISHED', f'https://github.com/{REPO}/tree/{BRANCH}')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--push', action='store_true')
    a = p.parse_args()
    publish(a.push)
