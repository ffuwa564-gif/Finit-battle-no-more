"""Synthetic method checks, never combat measurements."""
import hashlib
import itertools
import json
import math
from pathlib import Path
from paired_statistics import (self_test, discordant_difference_ci, cp,
                               bounded_mean_ci, DEFAULT_INTERVAL_CLAIMS)

self_test()
checks = []
for n in [2, 5, 10, 20]:
    for alpha in [.05, .05 / DEFAULT_INTERVAL_CLAIMS]:
        intervals = {(b, k-b): discordant_difference_ci(b, k-b, n, alpha)
                     for k in range(n+1) for b in range(k+1)}
        minimum = (1.0, None)
        for q, pi in itertools.product([0, .01, .1, .3, .5, .9, 1], repeat=2):
            truth = q * (2*pi-1)
            coverage = 0.0
            for k in range(n+1):
                pk = math.comb(n, k) * q**k * (1-q)**(n-k)
                for b in range(k+1):
                    p = pk * math.comb(k, b) * pi**b * (1-pi)**(k-b)
                    lo, hi = intervals[b, k-b]
                    if lo-1e-12 <= truth <= hi+1e-12:
                        coverage += p
            if coverage < minimum[0]:
                minimum = (coverage, [q, pi])
            assert coverage >= 1-alpha-1e-10, (n, alpha, q, pi, coverage)
        checks.append({'n': n, 'alpha': alpha,
                       'minimumGridCoverage': minimum[0],
                       'minimumGridParameter': minimum[1],
                       'nominalCoverage': 1-alpha,
                       'syntheticParameterPairs': 49})
alpha = .05 / DEFAULT_INTERVAL_CLAIMS
examples = [{'better': b, 'worse': w,
             'interval': discordant_difference_ci(b, w, 256, alpha)}
            for b, w in [(0, 0), (8, 0), (16, 0), (20, 0), (32, 4)]]
report = {
    'passed': True, 'synthetic': True,
    'notCombatEvidence': True,
    'method': 'CP discordance-rate/conditional-direction rectangle',
    'coverageProof': 'statistical-analysis-plan.md, union-bound derivation',
    'finiteEnumerationIsNotAUniversalProof': True,
    'intervalClaimCount': DEFAULT_INTERVAL_CLAIMS,
    'pairedCodeSha256': hashlib.sha256(
        Path(__file__).with_name('paired_statistics.py').read_bytes()).hexdigest(),
    'checks': checks, 'syntheticExamples': examples,
    'allWinsAbsoluteInterval': cp(256, 256, alpha),
    'zeroMeanRoundDifferenceBound': bounded_mean_ci([0]*256, -80, 80, alpha),
}
root = Path(__file__).resolve().parents[3]
out = root/'artifacts/this-girl-01/research/reports/method-validation'
out.mkdir(parents=True, exist_ok=True)
(out/'statistics-selftest.json').write_text(json.dumps(report, indent=2))
print(json.dumps({'passed': True, 'synthetic': True,
                  'codeSha256': report['pairedCodeSha256'],
                  'zeroDiscordanceCI': examples[0]['interval'],
                  'enumerationChecks': len(checks)}, indent=2))
