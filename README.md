# Bob Lens 🔍

**A live behavioral visualizer for IBM Bob — see what AI changed, understand it, test it, approve it.**

![Built for IBM Bob Hackathon 2026](https://img.shields.io/badge/IBM%20Bob%20Hackathon-2026-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## The Problem

Engineers using AI coding assistants face a critical challenge:

- **They approve changes they don't fully understand** — AI makes the code, but what does it actually *do* differently?
- **Code diffs show what lines changed — not what the application does differently** — A `+` or `-` doesn't explain behavioral impact

### The Landscape of Existing Tools

Several tools address parts of this problem — **CodeSee** visualizes codebase architecture and PR impact, **Noodles** generates visual AST diffs of AI-generated code, **Greptile** and **Graphite** offer AI-powered PR review with codebase context, and **CodeVisualizer** generates function flowcharts. These are genuinely useful.

### What Makes Bob Lens Different

Bob Lens is not a PR review tool or a static visualizer. It operates at a different moment in the workflow — **between AI agent action and developer approval, before any commit exists**. Specifically:

1. **It integrates directly with IBM Bob's checkpoint system** — reading before/after states that only exist inside Bob's shadow Git repo
2. **It uses BobShell to have Bob explain its own changes** — the AI that made the change is the AI explaining it
3. **It runs live test execution through the changed code before approval** — not static analysis, actual execution
4. **It triggers automatically via MCP when Bob writes files** — no manual step required

The combination of these four things — native checkpoint integration, self-explaining AI, live sandbox execution, and automatic MCP triggering — is what existing tools don't do together.

---

## What Bob Lens Does

Bob Lens provides a complete workflow for understanding and validating AI-generated code changes:

### The Full User Journey

1. **Bob makes changes** → Bob Lens detects them automatically via MCP integration
2. **Shows before/after code** → Per-file tabbed layout with syntax highlighting
3. **👁 Eye button triggers BobShell analysis** → Bob explains its own changes programmatically
4. **Visual flow diagram** → See execution path before and after, side-by-side
5. **Live test runner** → Type HTTP inputs, watch request animate through each layer
6. **Approve or Rollback** → One-click decision with full context

### Key Features

- **Automatic Change Detection**: Bob calls Bob Lens via MCP when files change
- **Before/After Code View**: Tabbed interface showing original vs. modified code with unified diffs
- **AI-Powered Analysis**: BobShell explains behavioral changes in plain English
- **Visual Flow Diagrams**: See how data flows through your application before and after changes
- **Live Test Execution**: Run HTTP requests through changed backend code and watch each layer execute
- **Risk Assessment**: Bob evaluates changes as "safe", "review", or "risky"
- **One-Click Actions**: Approve or rollback changes instantly

### Screenshots

![Bob Lens UI](docs/screenshots/Screenshot%202026-05-16%20at%208.03.54%20AM.png)

*Bob Lens showing before/after code comparison with file tabs and analysis panel*

---

## Why IBM Bob Is Central

Bob Lens is **built exclusively for IBM Bob** and leverages Bob's unique capabilities:

| Bob Feature | How Bob Lens Uses It |
|-------------|---------------------|
| **MCP Support** | Bob calls Bob Lens automatically — no manual integration needed |
| **Checkpoints** | Provides the "before" state of every changed file via git refs |
| **BobShell** | Powers the 👁 analysis — Bob explains its own changes programmatically |
| **Task Sessions** | Groups related file changes together automatically |

**None of this works without Bob.** Claude Code and Codex have no equivalent MCP integration, checkpoint system, or programmatic self-analysis capability.

---

## Architecture

```
IBM Bob IDE
    │ MCP tool calls (notify_change, ask_bob, run_test)
    ▼
Bob Lens MCP Server (STDIO)
    │ WebSocket broadcast (port 8081)
    ▼
Bob Lens UI (port 3333)
    │ HTTP requests
    ▼
Sandbox Runner (port 3334)
    │ child_process.spawn
    ▼
BobShell → Bob AI Analysis
```

### Component Breakdown

- **MCP Server**: Receives change notifications from Bob, tracks file states, runs BobShell analysis
- **UI**: React app displaying before/after code, flow diagrams, and test results
- **Sandbox**: Isolated execution environment for running changed code safely
- **BobShell**: IBM Bob's CLI for programmatic AI analysis

---

## Getting Started

### Prerequisites

- **IBM Bob IDE** installed and logged in ([bob.ibm.com](https://bob.ibm.com))
- **BobShell** installed (`bob --version` should work)
- **Node.js 18+**

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd bob-lens

# Install all dependencies
npm run install:all

# Configure MCP server
cp mcp-server/.env.example mcp-server/.env
# Edit mcp-server/.env and add your BOB_PATH (run: which bob)
```

### Attach to Any Project

Bob Lens can visualize changes in any project. Here's how:

#### Option 1: Start Bob Lens Pointing at Your Project

```bash
# Start Bob Lens with your project path
WORKSPACE_PATH=/path/to/your/project npm run dev
```

This starts:
- MCP Server on STDIO (for Bob communication)
- UI on http://localhost:3333
- Sandbox on http://localhost:3334

#### Option 2: Add to Your Project's MCP Config

Add Bob Lens to your project's `.bob/mcp.json`:

```json
{
  "mcpServers": {
    "bob-lens": {
      "command": "node",
      "args": ["/path/to/bob-lens/mcp-server/dist/index.js"],
      "env": {
        "WORKSPACE_PATH": "/path/to/your/project"
      }
    }
  }
}
```

Then restart Bob IDE to load the MCP server.

---

## How to Use

### Step-by-Step Workflow

1. **Start Bob Lens**
   ```bash
   npm run dev
   ```

2. **Open the UI**
   - Navigate to http://localhost:3333
   - You'll see "Waiting for Bob" initially

3. **Ask IBM Bob to Make Changes**
   - In Bob IDE, ask Bob to modify your project
   - Example: "Add error handling to the user controller"

4. **Bob Lens Detects Changes Automatically**
   - Changes appear in tabs (one per file)
   - Each tab shows before/after code and diff

5. **Review Before/After Code**
   - Click tabs to switch between changed files
   - See color-coded diffs (green = added, red = removed)

6. **Click 👁 to Trigger Bob's Analysis**
   - Wait ~30 seconds for BobShell to analyze
   - See visual flow diagram of what changed
   - Read Bob's explanation and risk assessment

7. **Switch to Backend Tab and Click "Run Test"**
   - Enter HTTP method, endpoint, headers, and body
   - Watch execution animate through each layer:
     - Input validation
     - Middleware
     - Controller
     - Database operations
     - Response

8. **Make Your Decision**
   - Click **✓ Approve** to accept changes
   - Click **↩ Rollback** to revert changes

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **MCP Server** | Node.js + @modelcontextprotocol/sdk | Connects Bob IDE to Bob Lens |
| **UI** | React + Vite | Displays changes and analysis |
| **Analysis** | BobShell (IBM Bob CLI) | AI-powered behavioral analysis |
| **Diff** | diff npm package | Generates unified diffs |
| **Sandbox** | Node.js + isolated-vm | Safe code execution environment |
| **Screenshots** | Puppeteer | Visual regression testing |
| **Styling** | Pure CSS with VS Code design tokens | Native IDE look and feel |

---

## Hackathon Submission Notes

**Built for IBM Bob Hackathon May 2026**

**Theme**: Turn idea into impact faster

### What Makes This Special

1. **Bob-Native Integration**: Uses MCP, checkpoints, and BobShell — features unique to IBM Bob
2. **Behavioral Focus**: Shows *what changed* in behavior, not just code
3. **Live Testing**: Execute changed code without deploying
4. **AI Self-Analysis**: Bob explains its own changes using BobShell
5. **Production-Ready**: Works with any existing codebase, no setup required

### Session Reports

All Bob development sessions are documented in `bob_sessions/` folder, showing the iterative development process with IBM Bob.

---

## Project Structure

```
bob-lens/
├── mcp-server/          # MCP server for Bob IDE integration
│   ├── src/
│   │   ├── index.ts     # Entry point
│   │   ├── server.ts    # MCP tool handlers
│   │   ├── services/
│   │   │   ├── change-tracker.ts    # Tracks file changes
│   │   │   ├── bobshell-runner.ts   # Runs Bob analysis
│   │   │   └── websocket.ts         # UI communication
│   │   └── tools/
│   │       ├── notify-change.ts     # MCP tool: notify_change
│   │       ├── ask-bob.ts           # MCP tool: ask_bob
│   │       └── run-test.ts          # MCP tool: run_test
├── ui/                  # React visualization UI
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChangeViewer.tsx     # Before/after code view
│   │   │   ├── AnalysisPanel.tsx    # Bob's analysis display
│   │   │   ├── FlowDiagram.tsx      # Visual flow graph
│   │   │   └── TestRunner.tsx       # Live test execution
│   │   └── hooks/
│   │       └── useWebSocket.ts      # Real-time updates
├── sandbox/             # Isolated code execution
│   ├── src/
│   │   ├── services/
│   │   │   ├── request-runner.ts    # HTTP request simulator
│   │   │   ├── vm-runner.ts         # VM isolation
│   │   │   └── screenshot.ts        # Visual testing
├── types/               # Shared TypeScript types
└── docs/
    └── screenshots/     # UI screenshots
```

---

## Development

### Running Individual Components

```bash
# MCP Server only
npm run dev:mcp

# UI only
npm run dev:ui

# Sandbox only
npm run dev:sandbox

# All together (recommended)
npm run dev
```

### Building for Production

```bash
npm run build:all
```

### Environment Variables

**mcp-server/.env**:
```env
BOB_PATH=/path/to/bob
WORKSPACE_PATH=/path/to/your/project
```

**ui/.env**:
```env
VITE_WS_URL=ws://localhost:8081
VITE_SANDBOX_URL=http://localhost:3334
```

**sandbox/.env**:
```env
PORT=3334
```

---

## Contributing

This project was built for the IBM Bob Hackathon 2026. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License - see LICENSE file for details

---

## Acknowledgments

- **IBM Bob Team** for creating an AI coding assistant with MCP support and BobShell
- **Model Context Protocol** for enabling seamless IDE integration
- **React Flow** for the visual flow diagram library

---

**Made with Bob** 🤖

*Turn idea into impact faster.*