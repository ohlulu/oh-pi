# Mockup Line Number Maintenance

Mockup line numbers drift after edits. Each project should include an `update-screen-index.py`
(or similar script) in the `mockup/` directory to auto-update README.md line numbers.

## Where the Script Lives

`mockup/update-screen-index.py` — travels with the project, not the skill.
Each project has different HTML structures, CSS section names, and display name mappings — the script is project-specific.

## Usage

```bash
cd <project-doc>/mockup && python3 update-screen-index.py
```

## What the Script Should Do

1. Scan `mockup.html` for all frame start lines (anchor on `class="frame"` + `class="frame-label"`)
2. Scan `mockup.css` for all top-level section start lines (anchor on `/* ── Section Name ── */`)
3. Compute line ranges for each frame / section (start line to next sibling - 1)
4. Update `README.md`:
   - Common CSS table line numbers
   - Screen Index HTML Lines column
   - Extra CSS `SectionName(start-end)` references
5. Leave Related Specs column untouched (manually maintained)
6. Be idempotent — no file write if nothing changed

## Caveats

When matching CSS display names, watch out for partial matches (e.g. `Card` vs `Dialog Card`).
Process longer names first and use negative lookbehind to prevent false matches.

## When to Run

After editing mockup.html or mockup.css, before committing.
