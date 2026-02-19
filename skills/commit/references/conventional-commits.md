# Conventional Commits Reference

Based on the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.

## Message Format

```
<type>[(<scope>)][!]: <subject>
                                    ← blank line
[body]
                                    ← blank line
[footer(s)]
```

### Subject Line

- Imperative mood ("add", not "added" or "adds")
- Lowercase first letter
- No trailing period
- Maximum 72 characters
- Concise but specific

### Body

- Separated from subject by a blank line
- Explain **why**, not what (the diff shows what)
- Wrap at 72 characters per line

### Footer

- `BREAKING CHANGE: <description>` for breaking changes
- `Refs: #123` or `Closes: #456` for issue references
- Multiple footers allowed, one per line

## Type Definitions

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(cart): add quantity selector` |
| `fix` | Bug fix | `fix(auth): prevent token refresh loop` |
| `refactor` | Code restructure, no behavior change | `refactor: extract validation into helper` |
| `docs` | Documentation changes only | `docs: update API endpoint examples` |
| `style` | Formatting, whitespace, semicolons | `style: apply swiftformat rules` |
| `test` | Add or update tests | `test(parser): add edge case for empty input` |
| `perf` | Performance improvement | `perf(db): add index on user_id column` |
| `build` | Build system or dependencies | `build: upgrade swift-syntax to 6.0` |
| `ci` | CI/CD pipeline changes | `ci: add nightly build workflow` |
| `chore` | Maintenance, tooling, misc | `chore: update gitignore for derived data` |

## Type Selection Guide

Ask yourself:

1. Does it add new capability? → `feat`
2. Does it fix broken behavior? → `fix`
3. Does it change code structure without changing behavior? → `refactor`
4. Does it only touch docs/comments? → `docs`
5. Does it only change formatting? → `style`
6. Does it only add/update tests? → `test`
7. Does it improve speed/memory? → `perf`
8. Does it change build config or deps? → `build`
9. Does it change CI/CD config? → `ci`
10. None of the above? → `chore`

## Breaking Changes

Two ways to signal:

```
feat(api)!: remove deprecated /v1/users endpoint

BREAKING CHANGE: the /v1/users endpoint has been removed, use /v2/users instead
```

The `!` in the subject line and the `BREAKING CHANGE` footer are both recommended for visibility.

## Good vs Bad Examples

### ✅ Good

```
feat(search): add fuzzy matching support
fix(upload): handle zero-byte files without crash
refactor(auth): split token logic into dedicated service
docs(readme): add setup instructions for Apple Silicon
test(cart): cover discount calculation edge cases
perf(list): use lazy loading for large datasets
build: pin swiftlint to 0.54.0
ci: cache spm dependencies between runs
chore: remove unused legacy migration scripts
```

### ❌ Bad

```
Updated stuff                          # vague, no type
feat: Fix bug                          # wrong type
Fix: login issue                       # capitalized type
feat(auth): Added OAuth2 support.      # past tense, trailing period
FEAT: new feature                      # uppercase type
fix all the things                     # no type prefix, vague
feat(authentication-module-refactor-and-new-login-flow): ...
                                       # scope too long
```

## Multi-Purpose Changes

If a single diff serves multiple purposes, split into separate commits:

```bash
# First: the refactor
committer "refactor(auth): extract token refresh into service" \
  Sources/Auth/TokenService.swift \
  Sources/Auth/AuthManager.swift

# Then: the feature that builds on it
committer "feat(auth): add automatic token renewal" \
  Sources/Auth/TokenService.swift \
  Sources/Auth/AuthConfig.swift
```

## Scope Conventions

- Use the feature area or module name: `auth`, `cart`, `parser`, `db`
- Use the directory/package name when it maps cleanly
- Omit scope for project-wide changes: `refactor: rename all DTOs to models`
- Keep scope short: 1-2 words, lowercase
