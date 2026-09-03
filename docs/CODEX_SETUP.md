# ChatGPT Codex Setup in Cursor

Use this guide to let **ChatGPT (Codex)** view and edit this project — especially the 68W simulator — directly inside Cursor.

## 1. Install the Codex extension in Cursor

1. Open **Cursor**
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. Search for **OpenAI Codex** (extension ID: `openai.chatgpt`)
4. Install and reload Cursor

Cursor may prompt you to install this extension when you open the repo because `.vscode/extensions.json` recommends it.

## 2. Sign in to ChatGPT

1. Open Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Run **Codex: Open Codex Sidebar**
3. Sign in with your ChatGPT account (Plus, Pro, Team, or API key)

## 3. Open this repository

```bash
git clone https://github.com/venomexcavation-rgb/V2-MEDCODE.git
cd V2-MEDCODE
```

Open the **repository root** in Cursor (File → Open Folder).

If the 68W simulator is on a feature branch:

```bash
git checkout cursor/68w-training-platform-v1-e953
npm install
npm run dev
```

## 4. Trust the project (required for repo config)

When Codex asks you to trust this workspace, **accept**. That enables:

- `.codex/config.toml` (opens files in Cursor)
- `AGENTS.md` project instructions

## 5. Configure your user-level Codex settings

Create or edit `~/.codex/config.toml`:

```toml
model = "gpt-5.4"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
file_opener = "cursor"

# Optional: enable network for npm install, API calls, etc.
# network_access = true
```

> **Note:** `sandbox_mode` and auth cannot be set in the repo for security — they must live in your user config.

For unrestricted local editing (use only if you trust this machine):

```toml
sandbox_mode = "danger-full-access"
```

Restart Codex after changing config. Run `/status` in Codex chat to verify effective settings.

## 6. Start editing the 68W simulator

With the repo open, try prompts like:

- "Read AGENTS.md and explain the simulation architecture."
- "Add a new reassessment command to the action parser and wire it in the engine."
- "Improve Scenario 001 chest wound discovery without leaking hidden state in the UI."
- "Run npm test and fix any failures."

Codex automatically reads:

- `AGENTS.md` (project-wide rules)
- `src/engine/AGENTS.md` (engine-specific rules)

## 7. Optional — Codex on GitHub (cloud)

To let ChatGPT work on this repo in the cloud or on PRs:

1. Go to [ChatGPT Settings → Connectors](https://chatgpt.com/#settings/Connectors)
2. Connect **GitHub** and grant access to `venomexcavation-rgb/V2-MEDCODE`
3. In a PR comment, you can tag `@codex` with a task (e.g. `@codex update AGENTS.md with the new scenario flow`)

## 8. Optional — GitHub MCP (advanced)

For deeper GitHub integration from Codex, add to `~/.codex/mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>"
      }
    }
  }
}
```

## Verify it works

1. Codex sidebar is visible in Cursor
2. `npm start` opens AIDBAG in the Cursor terminal (no browser)
3. Ask Codex: **"List the main files in src/engine and summarize what executeAction does."**
4. Codex should read the codebase and respond with accurate file references

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Codex icon missing | Command Palette → **Codex: Open Codex Sidebar** |
| Can't write files | Set `sandbox_mode = "workspace-write"` in `~/.codex/config.toml` |
| Wrong editor for links | Set `file_opener = "cursor"` |
| Repo rules ignored | Mark project trusted; ensure `AGENTS.md` exists at repo root |
| 68W code not on main | Checkout branch `cursor/68w-training-platform-v1-e953` or merge PR #2 |
