---
summary: StoreKit configuration file existed on disk but was never added to Xcode project or scheme — sponsor IAP always showed "unavailable" in simulator
incident_date: 2026-03-13
tags:
  - config
  - iap
  - xcode-project
root_cause: SupportingFiles/ is a manual PBXGroup — new files are not auto-discovered by Xcode; no checklist step to verify project membership and scheme config after adding non-code assets
status: resolved
---

# StoreKit config not in Xcode project — sponsor IAP always unavailable

## What Happened

The Settings page sponsor section permanently displayed「目前暫時無法取得贊助方案」(Unable to load sponsorship option) in the simulator. `Product.products(for:)` returned empty because the StoreKit testing configuration was never wired into the build.

The `StoreKitConfiguration.storekit` file had been on disk since commit `e9b8b6e` (2026-03-06), but was never added to the Xcode project's `SupportingFiles` group or referenced by a shared scheme. The bug persisted silently for a week.

## Timeline

| When | What |
|------|------|
| `e9b8b6e` (Mar 6) | Created `StoreKitConfiguration.storekit` on filesystem only — not added to pbxproj |
| `3ee48fe` → `e43b148` | Full IAP feature built and iterated; `.productUnavailable` state handled gracefully in UI — masked the underlying config problem |
| Mar 13 | Noticed sponsor row always shows "unavailable"; investigated |
| Mar 13 | Added file ref to pbxproj + created shared scheme with `storeKitConfigurationFileReference` |

## Root Cause Analysis (5 Whys)

1. **Why** did the sponsor section show "unavailable"? → `Product.products(for:)` returned empty array
2. **Why** did it return empty? → Simulator had no StoreKit testing configuration; hit real App Store which has no matching product
3. **Why** no testing configuration? → The Xcode scheme had no `storeKitConfigurationFileReference` set
4. **Why** wasn't it set? → No shared `.xcscheme` file existed (auto-generated scheme doesn't include StoreKit config), and the `.storekit` file wasn't even in the Xcode project
5. **Why** wasn't the file in the project? → `SupportingFiles/` is a manual `PBXGroup` (not `PBXFileSystemSynchronizedRootGroup`), so files placed on disk aren't auto-discovered. The original commit only created the file — no one verified it appeared in Xcode's navigator or was selectable in scheme options. **Root cause: no verification step for non-synced groups + no shared scheme to persist StoreKit config.**

## Resolution

Two changes in pbxproj and scheme:

1. **`project.pbxproj`**: Added `StoreKitConfiguration.storekit` as a `PBXFileReference` and added it to the `SupportingFiles` group's children list.
2. **Created `xcshareddata/xcschemes/Babbby.xcscheme`**: Shared scheme with `storeKitConfigurationFileReference = "SupportingFiles/StoreKitConfiguration.storekit"` on `LaunchAction`.

## Why This Solution

- A shared scheme (vs. user-local) ensures every developer and CI gets the StoreKit config automatically.
- Adding the file to the project group makes it visible in Xcode's navigator and selectable in scheme options — prevents future confusion about "the file is there but Xcode doesn't see it."
- Alternative considered: converting `SupportingFiles/` to `PBXFileSystemSynchronizedRootGroup` — deferred because it changes how Xcode manages the entire group and could have side effects on `Info.plist` handling.

## What Went Well

- The `purchaseState = .productUnavailable` graceful degradation prevented a crash — users saw a disabled row instead of a broken screen.
- The `StoreKitClient` protocol abstraction made the issue easy to trace — clear separation between "can't fetch product" vs. "purchase failed."

## Action Items

| Action | Type | Status |
|--------|------|--------|
| Add `StoreKitConfiguration.storekit` to pbxproj + create shared scheme | prevent | [x] |
| Add debug log in `LiveStoreKitClient.fetchProduct` on failure (print product ID + error) | detect | [ ] |
| ~~Evaluate converting `SupportingFiles/` to `PBXFileSystemSynchronizedRootGroup`~~ — rejected: `Info.plist` and `.storekit` are non-bundle files; synced group would auto-copy them as resources, conflicting with `INFOPLIST_FILE` build setting. Manual PBXGroup is correct for this directory. | prevent | N/A |
| Add PR checklist item: "files added to manual PBXGroups (e.g. `SupportingFiles/`) must be verified in Xcode navigator" | prevent | [ ] |

## Lessons Learned

- **Manual PBXGroups are landmines.** Files on disk ≠ files in the project. Any non-synced group requires explicit verification that new files appear in Xcode's navigator after creation.
- **Graceful degradation can hide bugs.** The "unavailable" UI state was designed for edge cases, but it silently masked a fundamental configuration error for a week. Consider adding a `#if DEBUG` assertion or console warning when products fail to load.
- **Shared schemes should be committed.** Auto-generated schemes lose per-environment settings (StoreKit config, launch arguments, environment variables). If a scheme setting matters for dev, make it a shared scheme.
