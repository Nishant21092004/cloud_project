"""Compare surface statistics of the original paper text vs the humanised rewrite.

These are cheap style proxies (burstiness, repetition, connector density), not a
classifier verdict -- no detector is being queried here.
"""
import math
import os
import re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ORIG = "/home/user/paper_extracted.txt"
NEW = os.path.join(HERE, "paper_humanised.md")

AI_FILLERS = [
    "furthermore", "moreover", "in conclusion", "it is important to note",
    "it should be noted", "delve", "in today's", "notably", "overall",
    "additionally", "consequently", "therefore", "thus", "hence",
    "in summary", "plays a crucial role", "a wide range of", "in the realm of",
    "leveraging", "seamless", "robustly", "comprehensive understanding",
]

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


MATHISH = re.compile(r"[=∂Σ∑≈←−ℓρφλαεσ±]")


def prose_only(s):
    words = s.split()
    if len(words) < 8:
        return False
    if MATHISH.search(s):
        return False
    letters = sum(c.isalpha() or c.isspace() for c in s)
    return letters / max(1, len(s)) > 0.85


def clean_original(text):
    # keep only prose lines: skips page markers, table rows, equations, references
    lines = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s or s.startswith("===== PAGE"):
            continue
        if not prose_only(s):
            continue
        lines.append(s)
    return " ".join(lines)


def clean_new(md):
    out = []
    for ln in md.split("\n"):
        s = ln.strip()
        if not s or s.startswith("#") or s.startswith("![") or s.startswith("|"):
            continue
        if s.startswith("```") or s == "---" or s.startswith(">"):
            continue
        s = re.sub(r"[*`<>]", "", s)
        if not prose_only(s):
            continue
        out.append(s)
    return " ".join(out)


def stats(text, label):
    sents = [s for s in SENT_SPLIT.split(text) if len(s.split()) > 3]
    lens = [len(s.split()) for s in sents]
    n = len(lens)
    mean = sum(lens) / n
    var = sum((x - mean) ** 2 for x in lens) / n
    sd = math.sqrt(var)
    words = re.findall(r"[a-z']+", text.lower())
    wc = len(words)
    uniq_ratio = len(set(words)) / wc

    bigrams = Counter(zip(words, words[1:]))
    fourgrams = Counter(tuple(words[i:i + 4]) for i in range(len(words) - 3))
    rep4 = sum(c - 1 for c in fourgrams.values() if c > 1) / max(1, len(fourgrams))

    starts = Counter(s.split()[0].lower().strip(",") for s in sents)
    start_top = starts.most_common(1)[0]

    fill = {f: len(re.findall(r"\b" + re.escape(f), text.lower())) for f in AI_FILLERS}
    fill_total = sum(fill.values())
    per_1000 = fill_total / wc * 1000

    sents_per_par = None
    print(f"\n--- {label} ---")
    print(f"words                        : {wc}")
    print(f"sentences                    : {n}")
    print(f"mean sentence length (words) : {mean:.2f}")
    print(f"std dev sentence length      : {sd:.2f}")
    print(f"burstiness (sd/mean)         : {sd/mean:.3f}")
    print(f"unique word ratio            : {uniq_ratio:.3f}")
    print(f"repeated 4-gram rate         : {rep4*100:.2f}%")
    print(f"most common sentence opener  : '{start_top[0]}' x{start_top[1]} "
          f"({start_top[1]/n*100:.1f}% of sentences)")
    print(f"AI-filler phrases / 1000 w   : {per_1000:.2f}  ({fill_total} hits)")
    hits = {k: v for k, v in fill.items() if v}
    print(f"filler breakdown             : {hits}")
    return dict(words=wc, n=n, mean=mean, sd=sd, burst=sd / mean,
                uniq=uniq_ratio, rep4=rep4 * 100, start=start_top,
                start_pct=start_top[1] / n * 100, filler=per_1000, hits=hits)


orig = stats(clean_original(open(ORIG, encoding="utf-8").read()), "ORIGINAL (pdf text)")
new = stats(clean_new(open(NEW, encoding="utf-8").read()), "HUMANISED (rewrite)")

print("\n=== delta ===")
print(f"burstiness      : {orig['burst']:.3f} -> {new['burst']:.3f}")
print(f"unique words    : {orig['uniq']:.3f} -> {new['uniq']:.3f}")
print(f"4-gram repeat   : {orig['rep4']:.2f}% -> {new['rep4']:.2f}%")
print(f"filler / 1000 w : {orig['filler']:.2f} -> {new['filler']:.2f}")
print(f"top opener share: {orig['start_pct']:.1f}% -> {new['start_pct']:.1f}%")
