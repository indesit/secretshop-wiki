# Company Wiki - AI Agent Guidelines

## Project Overview
This is a corporate knowledge base (Wiki) built using VitePress, Markdown, and Git. It serves as the single source of truth for company policies, standard operating procedures (SOPs), instructions, and regulations. The primary language for content is Ukrainian.

The project relies heavily on structured Markdown with specific frontmatter requirements for organization and validation.

## Architecture and Technologies
*   **Core:** VitePress (Vue.js based static site generator)
*   **Content:** Markdown (`.md`) files
*   **Automation:** Node.js scripts for validation, sidebar generation, and document scaffolding.
*   **Diagrams & Tabs:** `vitepress-plugin-mermaid`, `vitepress-plugin-tabs`

## Directory Structure
*   `docs/`: Contains all Wiki content, organized by domains.
    *   `company/`: Company mission, org structure, roles.
    *   `stores/`: Store operations.
    *   `product/`: Product receiving, transfers, defects.
    *   `returns-and-warranty/`: Returns, exchanges, warranties.
    *   `sales/`: Sales and consultations.
    *   `cash/`: Cash discipline.
    *   `hr/`: Personnel.
    *   `templates/`: Document templates.
    *   `glossary/`: Glossary of terms.
    *   `.vitepress/`: VitePress configuration.
*   `scripts/`: Automation scripts (validation, generation, etc.).
*   `.github/workflows/`: CI/CD pipelines.

## Building and Running
*   **Install dependencies:** `npm install`
*   **Run local dev server:** `npm run dev`
*   **Build for production:** `npm run build`
*   **Preview production build:** `npm run preview`
*   **Sync Docs (Sidebar, Indexes, Validation):** `npm run sync-docs`
*   **Run all checks & build:** `npm run docs:all`

## Development Conventions
1.  **Document Types:** Every document must have a specific type defined in its frontmatter:
    *   `policy` (What is allowed/forbidden)
    *   `regulation` (Responsibilities and rules)
    *   `sop` (Step-by-step procedure)
    *   `instruction` (How to perform a specific action)
    *   `checklist` (Checklist)
    *   `template` (Document template)
    *   `incident` (Action algorithm during an incident)
2.  **Document Status:**
    *   `draft`: Draft, not official (Default for new documents).
    *   `approved`: Approved by editor.
    *   `archived`: Obsolete.
3.  **Naming Convention:**
    *   Folders: `lowercase-kebab-case`
    *   Files: `type-topic-slug.md` or `topic-slug.md` (e.g., `sop-power-outage.md`).
4.  **Creating a New Document:**
    *   Use the interactive script: `npm run new-doc`
    *   Or use the CLI format (ideal for AI): `node scripts/new-doc.mjs --type <type> --domain <domain> --slug <slug> --title "<Title>"`
5.  **Validation:**
    *   Run `npm run validate` to ensure frontmatter (`title`, `type`, `status`, `owner`, `domain`) is present and correct.
6.  **Writing Style:**
    *   Write concisely, clearly, and operationally without fluff.
    *   If there is a doubt about a rule, mark it as `TODO` rather than inventing one.
    *   Add `related_documents` to frontmatter if there are logical connections.
    *   Do not modify an `approved` document without explicit instruction.
