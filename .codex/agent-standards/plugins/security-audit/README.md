# security-audit

Cloudflare's security-audit skill, copied unchanged from
[cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)
at `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`. MIT, see `LICENSE`.

It is a copy, not a pointer, because Claude Code installs a project-enabled
plugin by itself only when its files are inside a marketplace the machine
already knows. A marketplace entry that points at another repository leaves
every Mac to run `claude plugin install` by hand.

The marketplace entry sets `defaultEnabled: false`, so it loads only in
projects whose `.claude/settings.json` enables `security-audit@npomfret`.

Never edit `skills/` here. To take a newer upstream version: read the upstream
diff since the commit above, copy `skills/security-audit/` over this one,
update the commit in this file and in `plugin.json`, then
`python3 sync.py bump plugins/security-audit`.
