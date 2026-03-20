# CLAUDE.md

## gstack

For all web browsing, always use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.

### Available Skills

- `/office-hours` - Brainstorm and ideate on new ideas
- `/plan-ceo-review` - Review a plan from a strategy/CEO perspective
- `/plan-eng-review` - Review a plan from an engineering/architecture perspective
- `/plan-design-review` - Review a plan from a design perspective
- `/design-consultation` - Get help creating or refining a design system
- `/review` - Code review before merge
- `/ship` - Deploy or create a PR
- `/browse` - Headless web browsing (use this for ALL web browsing)
- `/qa` - Test the app end-to-end
- `/qa-only` - Run QA tests only (no fixes)
- `/design-review` - Visual design audit
- `/setup-browser-cookies` - Configure browser cookies for authenticated browsing
- `/retro` - Weekly retrospective
- `/investigate` - Debug and investigate errors
- `/document-release` - Post-ship documentation updates
- `/codex` - Get a second opinion or adversarial code review
- `/careful` - Work carefully with production or live systems
- `/freeze` - Scope edits to one module/directory
- `/guard` - Maximum safety mode (destructive warnings + edit restrictions)
- `/unfreeze` - Remove edit restrictions
- `/gstack-upgrade` - Upgrade gstack to the latest version

### Troubleshooting

If a gstack skill is not working, run the following command to rebuild binaries and re-register skills:

```
cd .claude/skills/gstack && ./setup
```
