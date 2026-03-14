---
summary: Crashlytics dSYM upload script silently failed since day one — wrong binary path for Firebase SDK 12.x
incident_date: 2026-02-25
tags:
  - config
  - dependency
  - observability
root_cause: Copied outdated Run Script from pre-12.x Firebase docs without verifying the upload actually ran
status: monitoring
---

# Crashlytics dSYM Upload Never Worked

## What Happened

Firebase Crashlytics was integrated on 2/25. The Run Script build phase that uploads dSYMs used the path `*/FirebaseCrashlytics/run` to find the upload binary. Firebase SDK 12.x ships the binary at `Crashlytics/upload-symbols` instead. The `find` returned empty, the `if [ -n "$SCRIPT" ]` guard silently skipped execution, and no dSYM was ever uploaded to Firebase. This went unnoticed for 16 days until the Crashlytics console showed "缺失（必需）" warnings for v1.2(1).

## Timeline

| When | What |
|------|------|
| 2/25 `00c58d0` | `feat(firebase): add firebase with crashlytics integration` — script copied with old path |
| 3/6 `076f77d` | v1.2 build 1 archived and shipped to App Store — dSYM not uploaded |
| 3/13 | Crashlytics console checked — 4 missing dSYMs discovered for v1.2(1) |
| 3/13 `05badba` | Fix: update find path to `*/Crashlytics/upload-symbols`, add `--build-phase` flag, add warning on miss |

## Root Cause Analysis (5 Whys)

1. **Why** are dSYMs missing in Crashlytics? → The upload script never ran successfully.
2. **Why** didn't it run? → `find` searched for `FirebaseCrashlytics/run` which doesn't exist in SDK 12.x.
3. **Why** was the wrong path used? → The script was copied from an outdated tutorial or older Firebase integration guide.
4. **Why** wasn't the mismatch caught? → The script exits silently when the binary isn't found — no error, no warning.
5. **Why** no verification after integration? → No post-integration smoke test to confirm dSYMs actually appear in the Firebase console. **Root cause: no observability on the upload step, and no verification gate after adding a crash reporting dependency.**

## Resolution

`Project.swift` Run Script updated (`05badba`):

- Find path: `*/FirebaseCrashlytics/run` → `*/Crashlytics/upload-symbols`
- Added `--build-phase` flag (lets the binary read dSYM paths from Xcode env vars directly)
- Added `else` branch that emits a build warning when the binary isn't found — no more silent failure

## Why This Solution

The `upload-symbols` binary with `--build-phase` is Firebase's current recommended approach for SPM-based projects. It reads `DWARF_DSYM_FOLDER_PATH` and platform from the build environment, which is more robust than passing paths manually. The warning on miss ensures any future path change surfaces immediately in the build log.

## What Went Well

- `DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym"` was correctly set for Release from day one — dSYMs were always *generated*, just not uploaded.
- `ExportOptions.plist` had `uploadSymbols: true` — Apple-side symbol upload was working.
- The guard `if [ "${DEBUG_INFORMATION_FORMAT}" != "dwarf-with-dsym" ]; exit` was a good idea to skip Debug builds. Just the next step was broken.

## Action Items

| Action | Type | Status |
|--------|------|--------|
| Add dSYM upload verification to `release.sh` — after archive+upload, query Crashlytics API or check build log for successful upload line | detect | [ ] |
| Manually upload v1.2(1) dSYM from xcarchive (if still available at `/tmp/Pikgeon.xcarchive`) | mitigate | [ ] |
| When integrating any new SDK with a build-phase script, do one Release archive → verify the side effect actually happened before merging | prevent | [ ] |

## Lessons Learned

- **Silent failure is the worst failure.** A script that does nothing and exits 0 is harder to debug than one that crashes. Always add an `else` with a warning or error when a critical binary/file isn't found.
- **Copy-pasted build scripts rot.** SDK major versions change binary names and paths. Pin the script to the SDK version you're actually using, or use the SDK's own recommended invocation (e.g. `--build-phase`).
- **Verify the side effect, not just the integration.** Adding a Crashlytics dependency and seeing no build errors ≠ working crash reporting. After any observability tool integration, trigger the expected output (upload, event, log) and confirm it arrives at the destination.
