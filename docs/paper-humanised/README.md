# Humanised paper

- `XAI_Modality_Bias_Paper_Humanised.pdf` / `.docx` — the deliverable (18 pages).
- `paper_humanised.md` — editable source. Edit this, then rebuild.
- `build.py` — renders the markdown to DOCX (python-docx) and PDF (reportlab).
- `figures/` — figures 1–4 cropped from the source PDF at 200 dpi.
- `CHANGES.md` — what changed, what was preserved, style statistics.
- `style_stats.py` — prints the before/after surface-style comparison.

```bash
python3 -m pip install python-docx reportlab pymupdf
python3 build.py
python3 style_stats.py
```
