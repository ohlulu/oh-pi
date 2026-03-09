---
summary: Tuist pitfalls — SPM binary xcframework linking bug and workaround.
read_when: Adding SPM binary xcframework via Tuist; SDK compiles but silently missing at runtime
---

# Tuist Pitfalls

## Binary xcframework transitive deps not linked ([#8056](https://github.com/tuist/tuist/issues/8056))

Tuist doesn't recursively resolve transitive dependencies of SPM binary targets. Wrapper-target chains (e.g. `FirebaseAnalytics` product → wrapper target → `.binaryTarget` xcframework) result in a ~50 KB empty stub copied to `Frameworks/` — actual static lib never linked. Build succeeds, import compiles, but SDK silently absent at runtime.

**Affected:** Any SPM package with binary targets behind wrapper targets + `.when(platforms:)`. Most notable: `FirebaseAnalytics`. Source-compiled targets (`FirebaseCrashlytics`) and direct binary targets (`GoogleMobileAds`) are fine.

**Diagnose:** `nm App.debug.dylib | grep componentsToRegister` — missing `FIRAnalyticsConnector` = not linked.

**Fix:** Add `-ObjC` to app target linker flags — forces linker to load all ObjC classes from static libs.

```swift
// Project.swift
"OTHER_LDFLAGS": .string("$(inherited) -ObjC"),
```
