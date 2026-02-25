/**
 * Review target types, prompt templates, and rubric loading for the review extension.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import path from "node:path";
import { homedir } from "node:os";
import { promises as fs } from "node:fs";
import { getMergeBase } from "./git.js";

// ---------------------------------------------------------------------------
// Review target types
// ---------------------------------------------------------------------------

export type ReviewTarget =
    | { type: "uncommitted" }
    | { type: "baseBranch"; branch: string }
    | { type: "commit"; sha: string; title?: string }
    | { type: "commitRange"; baseSha: string; headSha: string; baseTitle?: string; headTitle?: string }
    | { type: "custom"; instructions: string }
    | { type: "pullRequest"; prNumber: number; baseBranch: string; title: string }
    | { type: "folder"; paths: string[] };

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

const UNCOMMITTED_PROMPT = "Review the current code changes (staged, unstaged, and untracked files) and provide prioritized findings.";

const BASE_BRANCH_PROMPT_WITH_MERGE_BASE =
    "Review the code changes against the base branch '{baseBranch}'. The merge base commit for this comparison is {mergeBaseSha}. Run `git diff {mergeBaseSha}` to inspect the changes relative to {baseBranch}. Provide prioritized, actionable findings.";

const BASE_BRANCH_PROMPT_FALLBACK =
    'Review the code changes against the base branch \'{branch}\'. Start by finding the merge diff between the current branch and {branch}\'s upstream e.g. (`git merge-base HEAD "$(git rev-parse --abbrev-ref "{branch}@{upstream}")"`), then run `git diff` against that SHA to see what changes we would merge into the {branch} branch. Provide prioritized, actionable findings.';

const COMMIT_PROMPT_WITH_TITLE = 'Review the code changes introduced by commit {sha} ("{title}"). Provide prioritized, actionable findings.';

const COMMIT_PROMPT = "Review the code changes introduced by commit {sha}. Provide prioritized, actionable findings.";

const PULL_REQUEST_PROMPT =
    "Review pull request #{prNumber} (\"{title}\") against the base branch '{baseBranch}'. The merge base commit for this comparison is {mergeBaseSha}. Run `git diff {mergeBaseSha}` to inspect the changes that would be merged. Provide prioritized, actionable findings.";

const PULL_REQUEST_PROMPT_FALLBACK =
    "Review pull request #{prNumber} (\"{title}\") against the base branch '{baseBranch}'. Start by finding the merge base between the current branch and {baseBranch} (e.g., `git merge-base HEAD {baseBranch}`), then run `git diff` against that SHA to see the changes that would be merged. Provide prioritized, actionable findings.";

const COMMIT_RANGE_PROMPT =
    "Review the code changes between commit {baseSha} (\"{baseTitle}\") and commit {headSha} (\"{headTitle}\"). Run `git diff {baseSha}..{headSha}` to inspect the changes. Provide prioritized, actionable findings.";

const COMMIT_RANGE_PROMPT_NO_TITLES =
    "Review the code changes between commit {baseSha} and commit {headSha}. Run `git diff {baseSha}..{headSha}` to inspect the changes. Provide prioritized, actionable findings.";

const FOLDER_REVIEW_PROMPT =
    "Review the code in the following paths: {paths}. This is a snapshot review (not a diff). Read the files directly in these paths and provide prioritized, actionable findings.";

// ---------------------------------------------------------------------------
// Review rubric
// ---------------------------------------------------------------------------

const SHARED_REVIEW_RUBRIC_PATH = path.join(homedir(), ".pi", "agent", "shared", "prompts", "review-rubric.md");

// The detailed review rubric fallback (used if shared prompt file is missing)
const REVIEW_RUBRIC_FALLBACK = `# Review Guidelines

You are acting as a code reviewer for a proposed code change made by another engineer.

Below are default guidelines for determining what to flag. These are not the final word — if you encounter more specific guidelines elsewhere (in a developer message, user message, file, or project review guidelines appended below), those override these general instructions.

## Determining what to flag

Flag issues that:
1. Meaningfully impact the accuracy, performance, security, or maintainability of the code.
2. Are discrete and actionable (not general issues or multiple combined issues).
3. Don't demand rigor inconsistent with the rest of the codebase.
4. Were introduced in the changes being reviewed (not pre-existing bugs).
5. The author would likely fix if aware of them.
6. Don't rely on unstated assumptions about the codebase or author's intent.
7. Have provable impact on other parts of the code — it is not enough to speculate that a change may disrupt another part, you must identify the parts that are provably affected.
8. Are clearly not intentional changes by the author.
9. Be particularly careful with untrusted user input and follow the specific guidelines to review.

## Untrusted User Input

1. Be careful with open redirects, they must always be checked to only go to trusted domains (?next_page=...)
2. Always flag SQL that is not parametrized
3. In systems with user supplied URL input, http fetches always need to be protected against access to local resources (intercept DNS resolver!)
4. Escape, don't sanitize if you have the option (eg: HTML escaping)

## Comment guidelines

1. Be clear about why the issue is a problem.
2. Communicate severity appropriately - don't exaggerate.
3. Be brief - at most 1 paragraph.
4. Keep code snippets under 3 lines, wrapped in inline code or code blocks.
5. Use \`\`\`suggestion blocks ONLY for concrete replacement code (minimal lines; no commentary inside the block). Preserve the exact leading whitespace of the replaced lines.
6. Explicitly state scenarios/environments where the issue arises.
7. Use a matter-of-fact tone - helpful AI assistant, not accusatory.
8. Write for quick comprehension without close reading.
9. Avoid excessive flattery or unhelpful phrases like "Great job...".

## Review priorities

1. Call out newly added dependencies explicitly and explain why they're needed.
2. Prefer simple, direct solutions over wrappers or abstractions without clear value.
3. Favor fail-fast behavior; avoid logging-and-continue patterns that hide errors.
4. Prefer predictable production behavior; crashing is better than silent degradation.
5. Treat back pressure handling as critical to system stability.
6. Apply system-level thinking; flag changes that increase operational risk or on-call wakeups.
7. Ensure that errors are always checked against codes or stable identifiers, never error messages.

## Priority levels

Tag each finding with a priority level in the title:
- [P0] - Drop everything to fix. Blocking release/operations. Only for universal issues that do not depend on assumptions about inputs.
- [P1] - Urgent. Should be addressed in the next cycle.
- [P2] - Normal. To be fixed eventually.
- [P3] - Low. Nice to have.

## Output format

Provide your findings in a clear, structured format:
1. List each finding with its priority tag, file location, and explanation.
2. Findings must reference locations that overlap with the actual diff — don't flag pre-existing code.
3. Keep line references as short as possible (avoid ranges over 5-10 lines; pick the most suitable subrange).
4. At the end, provide an overall verdict: "correct" (no blocking issues) or "needs attention" (has blocking issues).
5. Ignore trivial style issues unless they obscure meaning or violate documented standards.
6. Do not generate a full PR fix — only flag issues and optionally provide short suggestion blocks.

Output all findings the author would fix if they knew about them. If there are no qualifying findings, explicitly state the code looks good. Don't stop at the first finding - list every qualifying issue.`;

export async function loadSharedReviewRubric(): Promise<string> {
    try {
        const content = await fs.readFile(SHARED_REVIEW_RUBRIC_PATH, "utf8");
        const trimmed = content.trim();
        return trimmed.length > 0 ? trimmed : REVIEW_RUBRIC_FALLBACK;
    } catch {
        return REVIEW_RUBRIC_FALLBACK;
    }
}

export async function loadProjectReviewGuidelines(cwd: string): Promise<string | null> {
    let currentDir = path.resolve(cwd);

    while (true) {
        const piDir = path.join(currentDir, ".pi");
        const guidelinesPath = path.join(currentDir, "REVIEW_GUIDELINES.md");

        const piStats = await fs.stat(piDir).catch(() => null);
        if (piStats?.isDirectory()) {
            const guidelineStats = await fs.stat(guidelinesPath).catch(() => null);
            if (guidelineStats?.isFile()) {
                try {
                    const content = await fs.readFile(guidelinesPath, "utf8");
                    const trimmed = content.trim();
                    return trimmed ? trimmed : null;
                } catch {
                    return null;
                }
            }
            return null;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            return null;
        }
        currentDir = parentDir;
    }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * Build the review prompt based on target
 */
export async function buildReviewPrompt(pi: ExtensionAPI, target: ReviewTarget): Promise<string> {
    switch (target.type) {
        case "uncommitted":
            return UNCOMMITTED_PROMPT;

        case "baseBranch": {
            const mergeBase = await getMergeBase(pi, target.branch);
            if (mergeBase) {
                return BASE_BRANCH_PROMPT_WITH_MERGE_BASE.replace(/{baseBranch}/g, target.branch).replace(/{mergeBaseSha}/g, mergeBase);
            }
            return BASE_BRANCH_PROMPT_FALLBACK.replace(/{branch}/g, target.branch);
        }

        case "commit":
            if (target.title) {
                return COMMIT_PROMPT_WITH_TITLE.replace(/{sha}/g, target.sha).replace(/{title}/g, target.title);
            }
            return COMMIT_PROMPT.replace(/{sha}/g, target.sha);

        case "commitRange": {
            if (target.baseTitle && target.headTitle) {
                return COMMIT_RANGE_PROMPT
                    .replace(/{baseSha}/g, target.baseSha)
                    .replace(/{headSha}/g, target.headSha)
                    .replace(/{baseTitle}/g, target.baseTitle)
                    .replace(/{headTitle}/g, target.headTitle);
            }
            return COMMIT_RANGE_PROMPT_NO_TITLES
                .replace(/{baseSha}/g, target.baseSha)
                .replace(/{headSha}/g, target.headSha);
        }

        case "custom":
            return target.instructions;

        case "pullRequest": {
            const mergeBase = await getMergeBase(pi, target.baseBranch);
            if (mergeBase) {
                return PULL_REQUEST_PROMPT.replace(/{prNumber}/g, String(target.prNumber))
                    .replace(/{title}/g, target.title)
                    .replace(/{baseBranch}/g, target.baseBranch)
                    .replace(/{mergeBaseSha}/g, mergeBase);
            }
            return PULL_REQUEST_PROMPT_FALLBACK.replace(/{prNumber}/g, String(target.prNumber))
                .replace(/{title}/g, target.title)
                .replace(/{baseBranch}/g, target.baseBranch);
        }

        case "folder":
            return FOLDER_REVIEW_PROMPT.replace(/{paths}/g, target.paths.join(", "));
    }
}

/**
 * Get user-facing hint for the review target
 */
export function getUserFacingHint(target: ReviewTarget): string {
    switch (target.type) {
        case "uncommitted":
            return "current changes";
        case "baseBranch":
            return `changes against '${target.branch}'`;
        case "commit": {
            const shortSha = target.sha.slice(0, 7);
            return target.title ? `commit ${shortSha}: ${target.title}` : `commit ${shortSha}`;
        }
        case "commitRange": {
            const shortBase = target.baseSha.slice(0, 7);
            const shortHead = target.headSha.slice(0, 7);
            return `commit range ${shortBase}..${shortHead}`;
        }
        case "custom":
            return target.instructions.length > 40 ? target.instructions.slice(0, 37) + "..." : target.instructions;

        case "pullRequest": {
            const shortTitle = target.title.length > 30 ? target.title.slice(0, 27) + "..." : target.title;
            return `PR #${target.prNumber}: ${shortTitle}`;
        }

        case "folder": {
            const joined = target.paths.join(", ");
            return joined.length > 40 ? `paths: ${joined.slice(0, 37)}...` : `paths: ${joined}`;
        }
    }
}

// ---------------------------------------------------------------------------
// Preset selector options
// ---------------------------------------------------------------------------

export const REVIEW_PRESETS = [
    { value: "pullRequest", label: "Review a pull request", description: "(GitHub PR)" },
    { value: "baseBranch", label: "Review against a base branch", description: "(local)" },
    { value: "uncommitted", label: "Review uncommitted changes", description: "" },
    { value: "commit", label: "Review a commit", description: "" },
    { value: "commitRange", label: "Review a commit range", description: "(diff between two commits)" },
    { value: "folder", label: "Review files/folders", description: "(snapshot, not diff)" },
    { value: "custom", label: "Custom review instructions", description: "" },
] as const;

export type ReviewPresetValue = (typeof REVIEW_PRESETS)[number]["value"];

// ---------------------------------------------------------------------------
// Summary prompt for /end-review
// ---------------------------------------------------------------------------

export const REVIEW_SUMMARY_PROMPT = `We are switching to a coding session to continue working on the code. 
Create a structured summary of this review branch for context when returning later.
	
You MUST summarize the code review that was performed in this branch so that the user can act on it.

1. What was reviewed (files, changes, scope)
2. Key findings and their priority levels (P0-P3)
3. The overall verdict (correct vs needs attention)
4. Any action items or recommendations

YOU MUST append a message with this EXACT format at the end of your summary:

## Next Steps
1. [What should happen next to act on the review]

## Constraints & Preferences
- [Any constraints, preferences, or requirements mentioned]
- [Or "(none)" if none were mentioned]

## Code Review Findings

[P0] Short Title

File: path/to/file.ext:line_number

\`\`\`
affected code snippet
\`\`\`

Preserve exact file paths, function names, and error messages.
`;
