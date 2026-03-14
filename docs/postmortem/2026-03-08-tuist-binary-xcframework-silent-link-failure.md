---
summary: Tuist silently skips linking SPM binary xcframeworks behind wrapper targets — FirebaseAnalytics compiled but was absent at runtime
incident_date: 2026-03-08
tags:
  - config
  - dependency
  - observability
  - tuist
root_cause: Tuist doesn't recursively resolve transitive dependencies of SPM binary targets (tuist/tuist#8056) — build succeeds but SDK is missing at runtime
status: resolved
---

# Tuist Binary xcframework Silent Link Failure

## What Happened

After integrating Firebase SDK 12.x via Tuist, `FirebaseAnalytics` compiled and imported without errors, but the SDK was silently absent at runtime. Tuist doesn't recursively resolve transitive dependencies of SPM binary targets — wrapper-target chains (e.g. `FirebaseAnalytics` product → wrapper target → `.binaryTarget` xcframework) result in a ~50 KB empty stub copied to `Frameworks/` while the actual static lib is never linked. Build succeeds, import compiles, zero runtime errors — just no analytics data arriving.

Source-compiled targets (`FirebaseCrashlytics`) and direct binary targets (`GoogleMobileAds`) are unaffected.

## Timeline

| When | What |
|------|------|
| 2/25 `00c58d0` | Firebase integrated — `FirebaseAnalytics` added as dependency |
| 3/8 | Noticed analytics data missing in Firebase console |
| 3/8 | Diagnosed via `nm App.debug.dylib` — `FIRAnalyticsConnector` symbol missing |
| 3/8 `cfc0420` | Fix: explicit `GoogleAppMeasurement` dependency + `-ObjC` linker flag |

## Root Cause Analysis (5 Whys)

1. **Why** was FirebaseAnalytics absent at runtime? → The actual static lib was never linked into the binary.
2. **Why** wasn't it linked? → Tuist copied an empty stub instead of resolving the transitive binary xcframework.
3. **Why** does Tuist do this? → Known bug: [tuist/tuist#8056](https://github.com/tuist/tuist/issues/8056) — SPM binary targets behind wrapper targets with `.when(platforms:)` aren't resolved.
4. **Why** didn't the build fail? → The wrapper target provides enough type info for compilation; linking silently produces an incomplete binary.
5. **Why** wasn't this caught earlier? → No runtime validation that the SDK was actually loaded. **Root cause: SPM binary target resolution bug in Tuist, compounded by zero build-time or runtime signal when a dependency is silently absent.**

## Resolution

Two-part fix in `Project.swift` (`cfc0420`):

1. **Explicit transitive dependency** — added `GoogleAppMeasurement` as a direct `.remote()` package and `.package(product:)` dependency so Tuist sees the binary target directly.
2. **`-ObjC` linker flag** — forces the linker to load all ObjC classes from static libs, preventing partial linking.

```swift
// Project.swift
.remote(url: "https://github.com/google/GoogleAppMeasurement.git", ...),
// ...
.package(product: "GoogleAppMeasurement"),
// ...
"OTHER_LDFLAGS": .string("$(inherited) -ObjC"),
```

## Why This Solution

- The explicit dependency is the direct workaround recommended in the Tuist issue.
- `-ObjC` is belt-and-suspenders — even if another transitive binary target surfaces, the linker will pick it up.
- Alternative (switching to CocoaPods or manual xcframework embedding) would add more complexity than the workaround.

## What Went Well

- `nm` diagnosis was quick and conclusive — checking for specific symbols is a reliable way to verify linking.
- The Tuist issue was already documented upstream, which shortened the investigation.

## Action Items

| Action | Type | Status |
|--------|------|--------|
| When adding any new SPM package via Tuist, check if it uses binary xcframeworks behind wrapper targets — if so, add explicit dependency | prevent | [x] |
| Monitor [tuist/tuist#8056](https://github.com/tuist/tuist/issues/8056) — remove workaround when fixed upstream | mitigate | [ ] |

## Lessons Learned

- **"It compiles" ≠ "it's linked."** SPM and Tuist can produce binaries that import and compile against a framework that isn't actually present at runtime. Always verify with `nm` or runtime checks after adding dependencies that go through complex resolution chains.
- **Know your build tool's known bugs.** Tuist's SPM integration has documented edge cases. When using any code-gen build tool, scan its issue tracker for your dependency pattern before assuming it just works.
- **Silent absence is harder to catch than a crash.** Analytics, logging, and crash reporting SDKs fail open — they just don't send data. Add a smoke test or dashboard check within 24h of integration.
