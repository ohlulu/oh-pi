<!-- Source: https://github.com/AvdLee/Swift-Concurrency-Agent-Skill (MIT License) — synced 2026-02-19 -->
# Reference Index

Quick navigation for Swift Concurrency topics.

## Fundamentals

| File | Description |
|------|-------------|
| `async-await-basics.md` | Core async/await patterns, execution order, async let |
| `tasks.md` | Task lifecycle, cancellation, priorities, task groups |
| `glossary.md` | Term definitions for quick lookup |

## Thread Safety & Isolation

| File | Description |
|------|-------------|
| `actors.md` | Actor isolation, @MainActor, global actors, reentrancy |
| `sendable.md` | Sendable conformance, value/reference types, @unchecked |
| `threading.md` | Thread/task relationship, suspension points, isolation domains |

## Advanced Patterns

| File | Description |
|------|-------------|
| `async-sequences.md` | AsyncSequence, AsyncStream, bridging callbacks |
| `async-algorithms.md` | AsyncAlgorithms package, Combine migration, time-based operators |
| `memory-management.md` | Retain cycles in tasks, cleanup patterns |
| `performance.md` | Profiling with Instruments, optimization strategies |

## SwiftUI & Swift 6.2

| File | Description |
|------|-------------|
| `swiftui-concurrency.md` | Main-actor defaults, off-main-thread APIs, Sendable closures, Task bridging in SwiftUI |
| `approachable-concurrency.md` | Swift 6.2 approachable concurrency mode: detect settings, fix patterns, pitfalls |

## Integration & Migration

| File | Description |
|------|-------------|
| `core-data.md` | NSManagedObject patterns, custom executors |
| `migration.md` | Swift 6 migration strategy, @preconcurrency |
| `testing.md` | XCTest async patterns, Swift Testing |
| `linting.md` | SwiftLint rules, warning suppression strategies |

## Quick Links by Problem

### "I need to..."

- **Start using async/await** → `async-await-basics.md`
- **Run tasks in parallel** → `tasks.md` (async let, TaskGroup)
- **Protect shared state** → `actors.md`
- **Pass data between actors** → `sendable.md`
- **Bridge callback APIs** → `async-sequences.md` (AsyncStream)
- **Replace Combine operators** → `async-algorithms.md` (debounce, throttle, merge)
- **Debug threading issues** → `threading.md`
- **Fix memory leaks** → `memory-management.md`
- **Migrate to Swift 6** → `migration.md`
- **Test async code** → `testing.md`
- **Optimize performance** → `performance.md`
- **SwiftUI concurrency issues** → `swiftui-concurrency.md`
- **Use Swift 6.2 approachable concurrency** → `approachable-concurrency.md`

### "I'm getting an error about..."

- **"non-Sendable type"** → `sendable.md`, `threading.md`
- **"Main actor-isolated"** → `actors.md`, `threading.md`
- **"async_without_await"** → `linting.md`
- **Core Data warnings** → `core-data.md`
- **XCTest async errors** → `testing.md`
- **Sendable closure in Shape / Layout / visualEffect / onGeometryChange** → `swiftui-concurrency.md`
- **Swift 6.2 / approachable concurrency / main-actor-by-default** → `approachable-concurrency.md`

### "I want to migrate..."

- **Combine/RxSwift to Swift Concurrency** → `async-algorithms.md`, `migration.md`

## File Statistics

| File | Lines | Last Major Topic |
|------|-------|------------------|
| `migration.md` | ~860 | Swift 6, @preconcurrency, AsyncAlgorithms |
| `async-algorithms.md` | ~800 | Combine migration, operators |
| `actors.md` | ~640 | Custom executors, Mutex |
| `async-sequences.md` | ~715 | AsyncStream bridging, AsyncAlgorithms vs stdlib |
| `tasks.md` | ~605 | Task groups, cancellation |
| `sendable.md` | ~580 | Region isolation |
| `performance.md` | ~575 | Instruments profiling |
| `testing.md` | ~565 | Swift Testing |
| `memory-management.md` | ~540 | Task cleanup |
| `core-data.md` | ~535 | NSManagedObjectID |
| `threading.md` | ~450 | Isolation domains |
| `async-await-basics.md` | ~250 | URLSession patterns |
| `linting.md` | ~200 | SwiftLint config |
| `glossary.md` | ~130 | Term definitions |
| `swiftui-concurrency.md` | ~40 | SwiftUI + concurrency (Dimillian/Skills) |
| `approachable-concurrency.md` | ~50 | Swift 6.2 approachable concurrency (Dimillian/Skills) |
