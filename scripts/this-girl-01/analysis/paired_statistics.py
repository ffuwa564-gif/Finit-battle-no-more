"""Frozen paired analysis for STILLVEIL This Girl #01.

No data-dependent hypothesis deletion. A sign-test P value does not certify a
population mean difference. All confidence statements use one locked CI count.
Run --self-test after restoring the execution environment, before confirmation.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Iterable
from scipy.stats import beta, binomtest, wilcoxon

DEFAULT_INTERVAL_CLAIMS = 516
DEFAULT_PRIMARY_HYPOTHESES = 288
ALPHA = 0.05
ENDPOINTS = ("win", "cappedRounds", "potionsUsed", "allSurvive")


def cp(k: int, n: int, alpha: float) -> list[float]:
    if not (type(k) is int and type(n) is int and 0 <= k <= n and n > 0):
        raise ValueError("Invalid binomial counts")
    if not 0 < alpha < 1:
        raise ValueError("Invalid alpha")
    return [
        0.0 if k == 0 else float(beta.ppf(alpha / 2, k, n - k + 1)),
        1.0 if k == n else float(beta.ppf(1 - alpha / 2, k + 1, n - k)),
    ]


def discordant_difference_ci(better: int, worse: int, n: int,
                            alpha: float) -> list[float]:
    """Exact conservative paired interval via discordance rate and direction.

    K=B+W ~ Bin(n,q); B | K ~ Bin(K,pi); effect=q*(2*pi-1).
    Each CP interval has failure probability alpha/2. Their simultaneous
    rectangle has coverage >=1-alpha without independence. Evaluate all four
    product corners. At K=0, direction is unidentified, so use pi in [0,1].
    """
    if better + worse > n or min(better, worse) < 0:
        raise ValueError("Discordant cells exceed sample size")
    k = better + worse
    q = cp(k, n, alpha / 2)
    pi = cp(better, k, alpha / 2) if k else [0.0, 1.0]
    corners = [rate * (2 * direction - 1)
               for rate in q for direction in pi]
    return [max(-1.0, min(corners)), min(1.0, max(corners))]


def exact_sign_p(better: int, worse: int) -> float:
    return (float(binomtest(better, better + worse, 0.5,
                           alternative="two-sided").pvalue)
            if better + worse else 1.0)


def bounded_mean_ci(values: Iterable[float], lower: float, upper: float,
                    alpha: float) -> dict[str, Any]:
    """Conservative two-sided empirical-Bernstein bound, not bootstrap.

    For iid values in [a,b], union the two one-sided empirical-variance
    bounds with alpha/2 each. The resulting log term is log(4/alpha).
    This bound remains nonzero when the observed sample variance is zero.
    """
    x = [float(v) for v in values]
    if not x or lower >= upper or not 0 < alpha < 1:
        raise ValueError("Invalid bounded-mean arguments")
    if any(not math.isfinite(v) or not lower <= v <= upper for v in x):
        raise ValueError("Observed value outside the preregistered true bounds")
    n = len(x)
    mean = math.fsum(x) / n
    if n < 2:
        return {"mean": mean, "interval": [lower, upper],
                "variance": None, "radius": upper - lower,
                "method": "empirical-Bernstein", "alpha": alpha}
    variance = math.fsum((v - mean) ** 2 for v in x) / (n - 1)
    log_term = math.log(4 / alpha)
    radius = (math.sqrt(2 * variance * log_term / n)
              + 7 * (upper - lower) * log_term / (3 * (n - 1)))
    return {"mean": mean,
            "interval": [max(lower, mean - radius), min(upper, mean + radius)],
            "variance": variance, "radius": radius,
            "method": "two-sided empirical-Bernstein",
            "alpha": alpha, "trueBounds": [lower, upper],
            "assumption": "iid approximately uniform seed model; no bootstrap"}


def holm(pvalues: list[float]) -> list[float]:
    if any(not math.isfinite(p) or not 0 <= p <= 1 for p in pvalues):
        raise ValueError("Invalid P value")
    answer = [1.0] * len(pvalues)
    highest = 0.0
    for rank, (index, p) in enumerate(sorted(enumerate(pvalues),
                                           key=lambda item: item[1])):
        highest = max(highest, min(1.0, p * (len(pvalues) - rank)))
        answer[index] = highest
    return answer


def _integer(v: Any, lower: int, upper: int) -> bool:
    return type(v) is int and lower <= v <= upper


def validate_rows(rows: list[dict[str, Any]], cap: int) -> None:
    if not rows or not _integer(cap, 1, 100000):
        raise ValueError("Empty rows or invalid stage cap")
    seeds = [r.get("seed") for r in rows]
    if any(type(s) is not int for s in seeds) or len(set(seeds)) != len(seeds):
        raise ValueError("Seeds must be unique integer logical row IDs")
    for r in rows:
        if type(r.get("win")) is not bool:
            raise ValueError("Win must be a boolean, not truthy text")
        if not _integer(r.get("rounds"), 0, cap):
            raise ValueError("Invalid native round count")
        if not _integer(r.get("cappedRounds"), 0, cap):
            raise ValueError("Invalid capped round count")
        expected = r["rounds"] if r["win"] else cap
        if r["cappedRounds"] != expected:
            raise ValueError("Failures must retain the frozen cap")
        if not _integer(r.get("potionsUsed"), 0, 5):
            raise ValueError("Potion budget exceeded")
        if not _integer(r.get("survivors"), 0, 4):
            raise ValueError("Invalid survivor count")
        if "applicationSeed" in r and not _integer(
                r["applicationSeed"], 0, 2**32 - 1):
            raise ValueError("Invalid application seed")
        if "departureSeed" in r:
            if not _integer(r["departureSeed"], 0, 2**32 - 1):
                raise ValueError("Invalid departure seed")
            if "applicationSeed" in r:
                expected_seed = (r["applicationSeed"] * 1664525
                                 + 1013904223) & 0xffffffff
                if expected_seed != r["departureSeed"]:
                    raise ValueError("Departure seed does not match native LCG")


def arm_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(rows)
    won = [r for r in rows if r["win"]]
    return {"n": n, "wins": len(won), "winRate": len(won) / n,
            "meanCappedRounds": math.fsum(r["cappedRounds"] for r in rows) / n,
            "meanPotions": math.fsum(r["potionsUsed"] for r in rows) / n,
            "allSurviveWins": sum(r["win"] and r["survivors"] == 4 for r in rows),
            "meanWinningRounds": (math.fsum(r["rounds"] for r in won) / len(won)
                                  if won else None),
            "warning": "Observed panel means, not guaranteed population values"}


def analyze_pair(left: list[dict[str, Any]], right: list[dict[str, Any]],
                 cap: int, *, comparison_id: str,
                 interval_claims: int = DEFAULT_INTERVAL_CLAIMS,
                 alpha: float = ALPHA,
                 expected_seed_ids: Iterable[int] | None = None) -> dict[str, Any]:
    validate_rows(left, cap)
    validate_rows(right, cap)
    if len(left) != len(right) or [r["seed"] for r in left] != [
            r["seed"] for r in right]:
        raise ValueError("The same ordered logical seed rows are required")
    if expected_seed_ids is not None and [r["seed"] for r in left] != list(expected_seed_ids):
        raise ValueError("Seed IDs do not match the frozen confirmation lock")
    for field in ("applicationSeed", "departureSeed"):
        if any(field in r for r in left + right):
            if [r.get(field) for r in left] != [r.get(field) for r in right]:
                raise ValueError("Paired application/departure seed mismatch")
    if type(interval_claims) is not int or interval_claims < 1:
        raise ValueError("CI claim count must be frozen and positive")
    delta = alpha / interval_claims
    n = len(left)
    endpoints: dict[str, Any] = {}
    for key in ("win", "allSurvive"):
        a = [r["win"] if key == "win" else
             r["win"] and r["survivors"] == 4 for r in left]
        b = [r["win"] if key == "win" else
             r["win"] and r["survivors"] == 4 for r in right]
        better = sum(x and not y for x, y in zip(a, b))
        worse = sum(y and not x for x, y in zip(a, b))
        endpoints[key] = {
            "test": "exact two-sided McNemar",
            "unadjustedP": exact_sign_p(better, worse), "holmQ": None,
            "better": better, "worse": worse, "ties": n - better - worse,
            "observedDifference": (better - worse) / n,
            "differenceCI": discordant_difference_ci(better, worse, n, delta),
            "ciAlpha": delta, "favorableDirection": "positive",
            "directionVerified": False,
        }
    for key, bound in (("cappedRounds", cap), ("potionsUsed", 5)):
        differences = [x[key] - y[key] for x, y in zip(left, right)]
        better = sum(v < 0 for v in differences)
        worse = sum(v > 0 for v in differences)
        nonzero = better + worse
        auxiliary_rank_p = (float(wilcoxon(
            differences, zero_method="wilcox", alternative="two-sided",
            method="auto").pvalue) if nonzero else 1.0)
        endpoints[key] = {
            "test": "exact two-sided sign test; mean is a distinct estimand",
            "unadjustedP": exact_sign_p(better, worse), "holmQ": None,
            "better": better, "worse": worse, "ties": n - nonzero,
            "observedImprovementBalance": (better - worse) / n,
            "improvementBalanceCI": discordant_difference_ci(
                better, worse, n, delta),
            "observedBetterShareAmongNonTies": better / nonzero if nonzero else None,
            "meanDifference": bounded_mean_ci(
                differences, -bound, bound, delta),
            "auxiliaryWilcoxonP": auxiliary_rank_p,
            "auxiliaryWarning": "Not used as a test of the population mean",
            "ciAlpha": delta, "favorableMeanDirection": "negative",
            "frequencyBenefitVerified": False,
            "meanBenefitVerified": False,
        }
    common = [(a, b) for a, b in zip(left, right) if a["win"] and b["win"]]
    common_d = [a["rounds"] - b["rounds"] for a, b in common]
    return {
        "id": comparison_id, "n": n, "cap": cap,
        "leftSummary": arm_summary(left), "rightSummary": arm_summary(right),
        "endpoints": endpoints,
        "commonWinDescription": {
            "n": len(common),
            "observedMeanRoundDifference": (
                math.fsum(common_d) / len(common_d) if common_d else None),
            "scope": "Conditional on both winning; not a primary efficiency gate",
        },
        "inference": {
            "alpha": alpha, "intervalClaimCount": interval_claims,
            "intervalsInThisPair": 6,
            "seedModel": "Fixed SHA panel treated as approximately iid uniform seeds",
            "finitePanelCountsAreExact": True,
            "seedLockChecked": expected_seed_ids is not None,
            "universalOptimalityClaim": False,
        },
    }


def adjust_family(reports: list[dict[str, Any]], *,
                  expected_hypotheses: int = DEFAULT_PRIMARY_HYPOTHESES,
                  label: str = "main",
                  expected_comparison_ids: Iterable[str] | None = None,
                  expected_interval_claims: int = DEFAULT_INTERVAL_CLAIMS,
                  minimum_seeds: int = 200) -> None:
    ids = [report["id"] for report in reports]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate comparison IDs in frozen family")
    if expected_comparison_ids is not None and set(ids) != set(expected_comparison_ids):
        raise ValueError("Comparison IDs do not match the frozen lock")
    alphas = {report["inference"]["alpha"] for report in reports}
    if len(alphas) != 1:
        raise ValueError("Mixed alpha levels in a family")
    cutoff = next(iter(alphas))
    if any(report["n"] < minimum_seeds for report in reports):
        raise ValueError("Insufficient confirmation seed coverage")
    if any(report["inference"]["intervalClaimCount"] != expected_interval_claims for report in reports):
        raise ValueError("CI multiplicity does not match the frozen lock")
    lock_verified = (expected_comparison_ids is not None and
                     all(report["inference"]["seedLockChecked"] for report in reports))
    entries = [(report, key, report["endpoints"][key])
               for report in reports for key in ENDPOINTS]
    if len(entries) != expected_hypotheses:
        raise ValueError(
            f"Frozen {label} family requires {expected_hypotheses} hypotheses;"
            f" got {len(entries)}. Do not silently drop failed comparisons.")
    qvalues = holm([entry[2]["unadjustedP"] for entry in entries])
    for report in reports:
        report["familyAdjusted"] = True
        report["family"] = {"label": label, "hypotheses": expected_hypotheses,
                            "alpha": cutoff,
                            "expectedIdsChecked": expected_comparison_ids is not None,
                            "seedAndFamilyLockBound": lock_verified}
    for (_, key, endpoint), q in zip(entries, qvalues):
        endpoint["holmQ"] = q
        endpoint["holmFamily"] = label
        if key in ("win", "allSurvive"):
            endpoint["directionVerified"] = (
                lock_verified and q < cutoff and endpoint["differenceCI"][0] > 0)
        else:
            endpoint["frequencyBenefitVerified"] = (
                lock_verified and q < cutoff and endpoint["improvementBalanceCI"][0] > 0)
            endpoint["meanBenefitVerified"] = (
                lock_verified and q < cutoff and endpoint["meanDifference"]["interval"][1] < 0)


def absolute_win_interval(rows: list[dict[str, Any]], *,
                          interval_claims: int = DEFAULT_INTERVAL_CLAIMS,
                          alpha: float = ALPHA) -> dict[str, Any]:
    n = len(rows)
    wins = sum(r["win"] for r in rows)
    ci = cp(wins, n, alpha / interval_claims)
    return {"n": n, "wins": wins, "observedWinRate": wins / n,
            "simultaneousCI": ci, "ciAlpha": alpha / interval_claims,
            "observed75Percent": wins / n >= .75,
            "confidenceSupports75Percent": ci[0] >= .75}


def load_rows(path: str | Path) -> list[dict[str, Any]]:
    p = Path(path)
    raw = gzip.decompress(p.read_bytes()) if p.suffix == ".gz" else p.read_bytes()
    value = json.loads(raw)
    rows = value.get("rows") if isinstance(value, dict) else value
    if not isinstance(rows, list):
        raise ValueError("Expected a row array or an object with rows")
    return rows


def self_test() -> None:
    assert cp(0, 256, .05)[1] > 0
    assert cp(256, 256, .05)[0] < 1
    assert holm([.01, .02, .5]) == [.03, .04, .5]
    rows = [{"seed": i, "win": True, "rounds": 5, "cappedRounds": 5,
             "potionsUsed": 0, "survivors": 4} for i in range(256)]
    equal = analyze_pair(rows, rows, 80, comparison_id="self-equal")
    for key in ("win", "allSurvive"):
        lo, hi = equal["endpoints"][key]["differenceCI"]
        assert lo < 0 < hi
    lo, hi = equal["endpoints"]["cappedRounds"]["meanDifference"]["interval"]
    assert lo < 0 < hi
    shorter = [dict(r, rounds=4, cappedRounds=4) for r in rows]
    a = analyze_pair(shorter, rows, 80, comparison_id="self-better")
    assert a["endpoints"]["cappedRounds"]["unadjustedP"] < 1e-30
    assert a["endpoints"]["cappedRounds"]["improvementBalanceCI"][0] > 0
    broken = [dict(r) for r in rows]
    broken[0]["win"] = False
    try:
        analyze_pair(broken, rows, 80, comparison_id="self-invalid")
    except ValueError:
        pass
    else:
        raise AssertionError("Uncapped failure was accepted")
    try:
        adjust_family([equal])
    except ValueError:
        pass
    else:
        raise AssertionError("Incomplete confirmatory family was accepted")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--left")
    parser.add_argument("--right")
    parser.add_argument("--cap", type=int)
    parser.add_argument("--id")
    parser.add_argument("--out")
    parser.add_argument("--interval-claims", type=int, default=DEFAULT_INTERVAL_CLAIMS)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("Paired analysis self-tests passed")
        return
    if not all((args.left, args.right, args.cap, args.id, args.out)):
        parser.error("Supply --left --right --cap --id --out")
    result = analyze_pair(load_rows(args.left), load_rows(args.right), args.cap,
                          comparison_id=args.id, interval_claims=args.interval_claims)
    result["codeSha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    result["familyAdjusted"] = False
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print("Pair analyzed; frozen-family adjustment still required")


if __name__ == "__main__":
    main()
