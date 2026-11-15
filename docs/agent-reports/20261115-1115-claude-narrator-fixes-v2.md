# After-job report: narrator-fixes-v2

- Agent: claude (Fable 5.2 orchestrating; fixes written by an Opus 5.5 subagent, audit by another)
- Branch and PR: claude/narrator-fixes-v2, PR linked from this branch (replaces #124)
- Phase and plan: none. Follow-up to a stress audit Srishan asked for ("stress and smoke test all ... Preset Audio"). Short plan is in the PR body.
- Started and finished: 10:10 to 11:15 Eastern

This replaces #124. That branch was stacked on `amrit/narrator-game-moments` (#96). #96 was then squash-merged with
later commits, and #122 changed the same audio files, so #124 conflicted with `main` in eleven files. The three fix
commits were cherry-picked onto current `main` here; the old branch is kept, untouched.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Muting the narrator mid-line releases the music duck | Pass | High (gain targets), not checked by ear |
| A "Play again" inside the welcome's 120 s repeat cooldown no longer blocks other moments, and the welcome never plays mid-climb | Pass | High |
| A voice preview during pause keeps the parked game line, whether the preview is stopped or ends by itself | Pass | High |
| Re-selecting the same voice does not cancel the current line | Pass | Medium (covered inside the preview test) |
| `npm run check` and `npm run build` pass | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Each new test fails before its fix | Subagent restored the old code, ran the test | Failed before, passes after (reported by the subagent; I did not repeat this) |
| Audio tests | `npx vitest run src/audio` | 47 passed after resolving the cherry-pick conflicts (run by me) |
| Full check | `npm run check` | 83 files, 538 tests passed (run by me on the final commit of this branch) |
| Build | `npm run build` | built in 421 ms (run by me) |
| Diff review | `git diff origin/main HEAD` | Read by me; 4 files, 47 insertions, 11 deletions, no unrelated edits |

**Not verified:** real audio playback. Vitest only sees fake source nodes and gain targets, so nobody has listened to
the duck releasing, the resumed line, or the preview in a browser. The settings panel path (the voice select calling
`setVoice` on every change) was not exercised in a browser. Not tested on Safari or iOS.

## 3. Problems, workarounds and dead ends

- `git commit` fails inside the Bash sandbox for worktrees (`.git/worktrees/.../index.lock`). The subagent stopped as
  told. It then copied its changed files to numbered snapshot folders, and I committed each snapshot outside the
  sandbox so every fix is its own commit.
- Two cherry-picks conflicted and I resolved them by hand. In `src/audio/index.ts`, #122 added soundtrack and
  ambience updates next to the duck lines; both are kept. In `intro-player.ts`, #96's later commits added an
  `introducing` mode on the same three lines as the parked-line fix; each line now carries both changes. The fix was
  written before `introducing` existed, and no test covers a voice preview during the launch introduction.
- The restart test first imported the real `NARRATOR_LINES`, which broke `lane-boundaries.test.ts` (audio may not
  import content). It now uses the test file's existing voice data with the same cooldowns and exactly one welcome
  line, which is the shape that causes the bug.

## 4. Deviations from the plan

- No plan file; see the note above. Otherwise none.

## 5. Changes

- Files changed: `src/audio/narrator/intro-player.ts`, `src/audio/index.ts`,
  `src/audio/__tests__/engine.test.ts`, `src/audio/__tests__/narrator-moments.test.ts`.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: all of it. This is Amrit's audio lane. Each change is a few lines.
- `INDEX.md` updated for new exports: no. `isSpeaking()` is a new method on the player object, not a new module
  export, and `src/audio/INDEX.md` does not list the player's methods.

## 6. Follow-ups and questions for humans

- [ ] Amrit: Chris and Bill have no moment lines, so choosing either voice turns off the tutorial, fall, height,
      stage, finish and low-fuel narration. Intended?
- [ ] Amrit: a stage-completion line is dropped if it arrives within about 15 s of another line (30 s cooldown,
      15 s expiry, and stage is not exempt like tutorial). Intended?
- [ ] Amrit or Neil: orphan audio files nothing references (three footsteps, six old intro clips, five Chris moment
      clips). The README says old files are kept on purpose.
- [ ] Anyone with a browser and speakers: listen to mute mid-line, pause then preview then resume, and a quick
      "Play again".

## 7. Can a teammate explain this?

The narrator can hold a line without playing it, for example while the game is paused or the narrator is muted. The
music used to stay quiet whenever a line was held; now it only goes quiet while sound is really coming out. Two
other cases were fixed: restarting quickly no longer makes the narrator wait two minutes to say hello again, and
previewing a voice while paused no longer throws away the line that was playing.
