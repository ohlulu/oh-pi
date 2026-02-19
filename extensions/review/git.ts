/**
 * Git helper functions for the review extension.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Get the merge base between HEAD and a branch
 */
export async function getMergeBase(pi: ExtensionAPI, branch: string): Promise<string | null> {
    try {
        // First try using the local branch directly
        const { stdout: mergeBase, code } = await pi.exec("git", ["merge-base", "HEAD", branch]);
        if (code === 0 && mergeBase.trim()) {
            return mergeBase.trim();
        }

        // Fall back to upstream tracking branch
        const { stdout: upstream, code: upstreamCode } = await pi.exec("git", ["rev-parse", "--abbrev-ref", `${branch}@{upstream}`]);

        if (upstreamCode === 0 && upstream.trim()) {
            const { stdout: upstreamMergeBase, code: ubCode } = await pi.exec("git", ["merge-base", "HEAD", upstream.trim()]);
            if (ubCode === 0 && upstreamMergeBase.trim()) {
                return upstreamMergeBase.trim();
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Get list of local branches
 */
export async function getLocalBranches(pi: ExtensionAPI): Promise<string[]> {
    const { stdout, code } = await pi.exec("git", ["branch", "--format=%(refname:short)"]);
    if (code !== 0) return [];
    return stdout
        .trim()
        .split("\n")
        .filter((b) => b.trim());
}

/**
 * Get list of recent commits
 */
export async function getRecentCommits(pi: ExtensionAPI, limit: number = 10): Promise<Array<{ sha: string; title: string }>> {
    const { stdout, code } = await pi.exec("git", ["log", `--oneline`, `-n`, `${limit}`]);
    if (code !== 0) return [];

    return stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
            const [sha, ...rest] = line.trim().split(" ");
            return { sha, title: rest.join(" ") };
        });
}

/**
 * Check if there are uncommitted changes (staged, unstaged, or untracked)
 */
export async function hasUncommittedChanges(pi: ExtensionAPI): Promise<boolean> {
    const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
    return code === 0 && stdout.trim().length > 0;
}

/**
 * Check if there are changes that would prevent switching branches
 * (staged or unstaged changes to tracked files - untracked files are fine)
 */
export async function hasPendingChanges(pi: ExtensionAPI): Promise<boolean> {
    // Check for staged or unstaged changes to tracked files
    const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
    if (code !== 0) return false;

    // Filter out untracked files (lines starting with ??)
    const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim());
    const trackedChanges = lines.filter((line) => !line.startsWith("??"));
    return trackedChanges.length > 0;
}

/**
 * Parse a PR reference (URL or number) and return the PR number
 */
export function parsePrReference(ref: string): number | null {
    const trimmed = ref.trim();

    // Try as a number first
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0) {
        return num;
    }

    // Try to extract from GitHub URL
    // Formats: https://github.com/owner/repo/pull/123
    //          github.com/owner/repo/pull/123
    const urlMatch = trimmed.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
    if (urlMatch) {
        return parseInt(urlMatch[1], 10);
    }

    return null;
}

/**
 * Get PR information from GitHub CLI
 */
export async function getPrInfo(pi: ExtensionAPI, prNumber: number): Promise<{ baseBranch: string; title: string; headBranch: string } | null> {
    const { stdout, code } = await pi.exec("gh", ["pr", "view", String(prNumber), "--json", "baseRefName,title,headRefName"]);

    if (code !== 0) return null;

    try {
        const data = JSON.parse(stdout);
        return {
            baseBranch: data.baseRefName,
            title: data.title,
            headBranch: data.headRefName,
        };
    } catch {
        return null;
    }
}

/**
 * Checkout a PR using GitHub CLI
 */
export async function checkoutPr(pi: ExtensionAPI, prNumber: number): Promise<{ success: boolean; error?: string }> {
    const { stdout, stderr, code } = await pi.exec("gh", ["pr", "checkout", String(prNumber)]);

    if (code !== 0) {
        return { success: false, error: stderr || stdout || "Failed to checkout PR" };
    }

    return { success: true };
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(pi: ExtensionAPI): Promise<string | null> {
    const { stdout, code } = await pi.exec("git", ["branch", "--show-current"]);
    if (code === 0 && stdout.trim()) {
        return stdout.trim();
    }
    return null;
}

/**
 * Get the default branch (main or master)
 */
export async function getDefaultBranch(pi: ExtensionAPI): Promise<string> {
    // Try to get from remote HEAD
    const { stdout, code } = await pi.exec("git", ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"]);
    if (code === 0 && stdout.trim()) {
        return stdout.trim().replace("origin/", "");
    }

    // Fall back to checking if main or master exists
    const branches = await getLocalBranches(pi);
    if (branches.includes("main")) return "main";
    if (branches.includes("master")) return "master";

    return "main"; // Default fallback
}
