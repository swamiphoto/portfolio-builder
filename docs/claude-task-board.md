# Claude Task Board — Operating Protocol

This is the contract for how Claude works tasks off the board. The board is a
GitHub Project; the machine-readable state lives in issue **labels**, and the
board columns are a mirror kept in sync for the human to look at (especially on
mobile).

## The board

- **Project:** Claude Tasks — https://github.com/users/swamiphoto/projects/3
- **Repo:** `swamiphoto/portfolio-builder`
- **Columns (Status field):** Todo → In Progress → Done
- **You (the human)** drop cards into Todo (via the "Claude Task" issue
  template) and review finished work. **Claude** pulls from Todo, works, and
  reports back.

### Labels = the real state machine

| Label | Meaning |
|-------|---------|
| `claude-task` | This issue is a task for Claude (auto-applied by the template). |
| `needs-input` | Claude has a question. **Your turn** — reply in a comment. |
| `blocked` | Claude is stuck / can't proceed. Needs your attention. |
| `done-review-me` | Claude finished. PR + preview link are in a comment. Review it. |

An issue's state is derived, not stored twice:

- **Todo** — open, has `claude-task`, none of `needs-input` / `blocked` /
  `done-review-me`, and no open PR linked yet.
- **In Progress** — Claude is actively working it (transient, set at pickup).
- **Needs input** — has `needs-input` (waiting on you).
- **Done / review** — has `done-review-me` (waiting on your review).

## What Claude does each loop tick

1. **Check for your replies first.** For any issue labeled `needs-input` or
   `done-review-me` whose most recent comment is from **you** (not Claude):
   remove the flag label, move the card to **In Progress**, and continue the
   task using your comment as the new instruction. (This is the follow-up loop —
   you revise or approve by commenting; Claude resumes.)
2. **Otherwise pick up new work.** Take the oldest **Todo** issue.
3. **Move it to In Progress** on the board and post a one-line comment: "On it."
4. **Isolate the work.** Create a branch named `task/<issue#>-<short-slug>`
   (and, when running under Conductor, its own worktree). Never work two tasks
   on the same branch.
5. **Do the task** per the issue body, following all repo conventions
   (CLAUDE.md, skills, TDD where it applies).
6. **If you get a real question** — something only the human can answer — post
   the question as a comment, add `needs-input`, leave the card in In Progress,
   and move on to other work. Do **not** guess on decisions that are the
   human's to make.
7. **When finished:**
   - Push the branch and open a PR against `main` (do **not** merge).
   - Grab the branch's Vercel **preview URL** and take a **screenshot** of the
     change with the browser skill.
   - Post a comment: what changed, the preview link, the screenshot, the PR link.
   - Add `done-review-me` and move the card to **Done**.
8. **Never ship to production.** Merging a PR / promoting to prod is always the
   human's call. Claude stops at "PR + preview ready."

## Board mechanics (command reference)

Identifiers (captured at setup — stable for this project):

```
PROJECT_NUMBER = 3
OWNER          = @me   (swamiphoto)
PROJECT_ID     = PVT_kwHOAGe2Gs4BgwbA
STATUS_FIELD   = PVTSSF_lAHOAGe2Gs4BgwbAzhfuwpg
  Todo         = f75ad846
  In Progress  = 47fc9ee4
  Done         = 98236657
```

**List task issues (the Todo/flag queue):**

```bash
gh issue list --repo swamiphoto/portfolio-builder --label claude-task --state open \
  --json number,title,labels,updatedAt
```

**Ensure an issue is on the board (idempotent) and get its item id:**

```bash
gh project item-add 3 --owner "@me" --url <issue-url>   # add if missing
gh project item-list 3 --owner "@me" --format json      # find item id by issue
```

**Move a card to a column:**

```bash
gh project item-edit --id <ITEM_ID> --project-id PVT_kwHOAGe2Gs4BgwbA \
  --field-id PVTSSF_lAHOAGe2Gs4BgwbAzhfuwpg \
  --single-select-option-id <Todo|In Progress|Done option id>
```

**Flag a question / mark done:**

```bash
gh issue comment <issue#> --repo swamiphoto/portfolio-builder --body "<message>"
gh issue edit <issue#> --repo swamiphoto/portfolio-builder --add-label needs-input
gh issue edit <issue#> --repo swamiphoto/portfolio-builder --remove-label needs-input --add-label done-review-me
```

## How you run the loop

From this workspace:

```
/loop 10m check the Claude Task board per docs/claude-task-board.md and work the queue
```

It wakes every ~10 minutes, does one tick of the protocol above, and goes back
to sleep when the queue is empty. Stop it any time; it only makes progress while
this Mac is awake (local mode by design).
