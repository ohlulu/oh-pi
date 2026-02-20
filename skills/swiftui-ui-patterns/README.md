# SwiftUI UI Patterns

Best practices and example-driven guidance for building SwiftUI views and components — tabs, navigation, sheets, lists, and more.

## Usage

Ask the agent to build or refactor SwiftUI UI:

```
Build a tabbed app with NavigationStack in each tab
Add a sheet flow for editing an item
Create a searchable list with pull-to-refresh
```

## What It Does

- Provides component-specific patterns (TabView, NavigationStack, sheets, lists, grids, forms, etc.)
- Guides tab architecture and app wiring for new projects
- Enforces modern SwiftUI state management (`@State`, `@Observable`, `@Environment`)
- Supplies sheet best practices (item-driven, self-dismissing)

## When to Use

- Creating or refactoring SwiftUI views and screens
- Designing tab architecture with TabView
- Needing component-specific patterns and examples
- Scaffolding a new SwiftUI project

## Key Rules

- Use modern SwiftUI state; avoid unnecessary view models
- Prefer composition — keep views small and focused
- Use `.task` for async loading with explicit loading/error states
- Prefer `.sheet(item:)` over `.sheet(isPresented:)` when state represents a selected model

## References

- `references/components-index.md` — index of all component references
- `references/app-wiring.md` — app scaffolding with TabView + NavigationStack
- `references/navigationstack.md` — NavigationStack patterns
- `references/tabview.md` — TabView patterns
- `references/sheets.md` — sheet presentation patterns
- `references/list.md` — list and row patterns
- `references/scrollview.md` — ScrollView patterns
- `references/form.md` — form and input patterns
- `references/grids.md` — grid layout patterns
- `references/searchable.md` — searchable modifier patterns
- `references/controls.md` — button and control patterns
- `references/focus.md` — focus management
- `references/haptics.md` — haptic feedback patterns
- `references/theming.md` — theming and color schemes
- `references/overlay.md` — overlay and popover patterns
- `references/media.md` — media display patterns
- `references/deeplinks.md` — deep link handling
- `references/menu-bar.md` — macOS menu bar
- `references/macos-settings.md` — macOS settings window
- `references/split-views.md` — split view patterns
- `references/matched-transitions.md` — matched geometry transitions
- `references/loading-placeholders.md` — loading and placeholder states
- `references/lightweight-clients.md` — lightweight dependency clients
- `references/input-toolbar.md` — input toolbar patterns
- `references/title-menus.md` — title menu patterns
- `references/top-bar.md` — top bar patterns
