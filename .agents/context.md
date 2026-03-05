---
description: Organization Chart Manager - project context for AI agents
---

# Project Context

## What is this?
A browser-only organization chart editor. No server, no framework, no build step.
Three files: `index.html`, `index.css`, `app.js`.

## Tech Stack
- Vanilla JavaScript (IIFE pattern wrapping entire app)
- HTML5 Canvas for all drawing
- CSS3 with CSS custom properties (`:root` vars)
- localStorage for auto-persistence

## Architecture
- All app logic is in `app.js` inside a single IIFE `(function() { ... })()`
- State is a single `state` object containing: persons, regions, roles, connectors, textAnnotations
- Rendering: `render()` calls draw functions in order (grid → connectors → regions → text → persons)
- Coordinate system: world coordinates ↔ screen coordinates via `worldToScreen()` / `screenToWorld()`
- Two view modes: 'square' (top-down) and 'quarter' (isometric)

## Key Functions
- `addPerson(name, opts)` — create person with all fields
- `render()` — full canvas redraw
- `drawRegions()` — regions with color and person count badge
- `drawPersons()` — person icons with name labels and role badges
- `drawTextAnnotations()` — free-placed text boxes
- `updatePropsPanel()` — sync right sidebar with selected item
- `renderPersonList()` — tree-structured left sidebar
- `saveState()` / `loadState()` — localStorage persistence
- `getSnapshot()` / `restoreSnapshot()` — undo/redo snapshots
- `deleteSelected()` — handles person/region/connector/text deletion
- `selectAll()`, `copySelected()`, `pasteClipboard()`, `nudgeSelected()`

## Data Flow
1. User interaction (mouse/keyboard) → update `state`
2. `saveState()` → localStorage
3. `render()` → redraw canvas
4. `renderPersonList()` → update sidebar
5. `updatePropsPanel()` → update properties

## Important Conventions
- All IDs are auto-incremented via `state.nextId++`
- Region containment is spatial (position-based), not hierarchical in data
- Person's "home region" = smallest region containing their (x, y)
- Colors are stored as hex strings (#rrggbb)
- Undo snapshots are deep-cloned JSON

## File Guide
- `enhance.txt` — full enhancement history (#1-#12)
- `DEVELOPMENT.md` — human-readable architecture doc
- `goal.txt` — original project goals
- `README.md` — user-facing documentation with setup guide

## Current Status (as of 2026-03-05)
All enhancements #1-#12 implemented. App is fully functional with:
search, PNG export, CSV import, dark mode, text annotations,
region colors, person count badges, keyboard shortcuts (16 types),
copy/paste, undo/redo, JSON save/load, shareable URLs.
