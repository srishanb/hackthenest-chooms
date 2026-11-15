# Publishing stage layouts

The Stage Editor's **Save & publish to team** button creates a GitHub branch (named `codex/stage-layout-<id>`) through the GitHub API, commits the layout data, and opens a pull request. Open the returned PR link to follow review. Once merged, teammates pull the project and new builds use the layout by default. Existing open games need to reload after updating their checkout.

Publishing requires `npm run dev` on localhost and GitHub CLI (`gh`) signed into an account with write access to this repository. Credentials remain in the CLI; the browser receives no GitHub token. Production/static builds can test drafts but cannot publish them.

Only `src/content/sections/published-layouts.ts` is published. The operation never pushes the current checkout, so unrelated code or uncommitted changes cannot be uploaded. Every save creates a new branch; no force push or history deletion is used. The server only accepts requests from localhost, so reload the editor there before publishing. The normal reviewer handles the PR; saving is not an immediate main-branch update.

Before publishing, the server checks platform geometry, stage order, and final targets. This does not prove that every jump is reachable or that the layout is fun. Use **Test** and review the changed layout before merging.

If another layout has merged since this server's copy was updated, publishing stops. Pull or merge the latest default branch into your worktree, restart the server, and reapply the intended changes. Failed publication does not count as a successful save. A connection failure after a GitHub write can leave a branch or PR; check GitHub before retrying.

Old browser-only layouts are offered as editor drafts until the first team layout is bundled. Local previews are scoped to the bundled layout version, so a new team update cannot be hidden by an earlier browser save. Unsaved in-memory editor changes should be tested or published before leaving the page.
