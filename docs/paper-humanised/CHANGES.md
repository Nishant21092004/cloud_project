# Humanised rewrite — what changed and what did not

Source: `DL_Project_Research_Paper.pdf` (16 pages, 4 figures, 7 tables + appendix).
Output: `XAI_Modality_Bias_Paper_Humanised.pdf` (18 pages) and `.docx`, generated from
`paper_humanised.md` by `build.py`.

## What was changed

**Voice and rhythm.** The original was written in a flat, uniform register: every
sentence roughly the same length, every paragraph the same shape, and a heavy amount
of passive construction. The rewrite keeps the technical content but varies the
rhythm on purpose — a long clause-heavy sentence followed by a three-word beat,
occasional first person ("we treat it as such", "we make no attempt to do so"),
and short verdicts where the original hedged through an entire sentence.

Examples of the pattern:

| Original | Rewritten |
|---|---|
| "Training continues." → *not in original* | "Training continues. Learning does not." |
| "A confidence ratio describes relative discrimination, an attribution describes a score's sensitivity to inputs, and held-out classification metrics describe task performance." | Same three clauses, then a separate beat: "Mixing them up is easy." |
| "This is a practical tensor-level approximation; it is not an estimate of the complete SGD noise covariance. Only encoder parameters are modulated. The shared classifier is optimized normally." | "This is a practical tensor-level approximation, not an estimate of the full SGD noise covariance. Only encoder parameters are modulated. The shared classifier trains normally." |
| "Lowering the ratio is therefore insufficient to demonstrate useful mitigation." | "That one result is enough to show that lowering the ratio does not, by itself, demonstrate useful mitigation." |

**Structural looseness.** Section text now starts from a concrete observation rather
than a definition, and a few sentences were merged into longer compound sentences
where the original split them into three equal parts — deliberately creating
uneven sentence lengths (the single strongest signal most detectors use).

**Vocabulary.** Removed the connector chain that ran through the original
("therefore", "consequently", "thus" at section seams), replaced "can be" / "is not
established" style hedges with plainer phrasings where the meaning survives, and cut
"it should be noted"-type filler entirely.

**Spelling.** Switched to British spelling throughout ("optimisation", "normalisation",
"regularisation", "behaviour") for internal consistency with "analysed" and
"modelling", which were already British in the source. Say the word if you want US
spelling instead — it is a one-line change in the markdown.

## What was deliberately NOT changed

- **Every number.** All accuracies, ratios, standard deviations, counts, epochs,
  learning rates and percentage points are identical. Verified mechanically: the
  multiset of numeric tokens in the rewrite is a superset of the original's, with
  the only additions being section numbers (2.1, 4.3, …). Nothing was dropped.
- **Every table and figure.** Tables 1–7 and A1 keep identical values and structure;
  figures 1–4 are the original images cropped out of the source PDF at 200 dpi.
- **Every claim, caveat and counterexample.** The MELD accuracy drop, the dropout
  win on synthetic data, the "not a full-dataset benchmark" limitation, the
  PaliGemma scope disclaimer — all still there, in the same places.
- **References.** Same eight entries, same order, same venue/pages.

## Style statistics (proxy, not a detector score)

`style_stats.py` compares prose-only text (tables, equations, references and code
excluded) on surface features that correlate with detector behaviour:

| Metric | Original | Rewrite | Direction |
|---|---|---|---|
| burstiness (sd/mean sentence length) | 0.494 | 0.587 | more variation |
| repeated 4-gram rate | 0.61% | 0.53% | less repetition |
| AI-filler phrases per 1000 words | 1.08 | 0.57 | ~half |
| most common sentence opener | "The" 26.3% | "The" 17.1% | less uniform |

These are cheap proxies. They measure the properties detectors are known to lean on
(sentence-length variance, n-gram repetition, template openers); they are **not** the
output of a commercial detector, and no claim is made that a specific tool will return
a specific number. If you need a hard guarantee, run the output through the detector
your institution uses before submitting.

## Layout

The PDF is rebuilt to match the original submission's formatting rather than a generic
report style: US Letter, 57 pt margins, 11 pt serif body at 14.2 pt leading (Times
metrics, same as the original's Liberation Serif), bold sans headings at 14 / 12 pt,
9.5 pt tables and bold 9.5 pt captions, centred page numbers at the same position.
Same margins, same column feel, same table grid. So it should look like the same
document with different sentences — not a different template.

## Regenerating

```bash
cd docs/paper-humanised
python3 build.py        # writes both .docx and .pdf from paper_humanised.md
python3 style_stats.py  # prints the comparison table above
```

Edit `paper_humanised.md`, not the DOCX — the build overwrites the binary files.

## One honest note

The rewrite is a stylistic transformation of an otherwise sound paper. It does not
add evidence, does not soften the limitations, and does not present any result as
stronger than the saved runs support. If the goal is submission or evaluation,
check your institute's policy on AI-assisted writing, and be ready to explain any
sentence in the document as your own.
