# Agent guidance

This file applies both to `nus-dh/tpl-dataset` and to repositories created from it. Read `README.md` before making changes; repository-specific instructions take precedence where they differ.

## In every dataset repository

- This repository holds the data; the data portal is a metadata-only catalogue. Do not assume a GitHub commit or release publishes a catalogue record.
- Keep `metadata.json` public-safe and accurate. Replace example values before publishing. `role` may be `master` or `derived`; add `derivedFrom` references only for confirmed catalogue parents. If a parent is unknown, keep `[]` or omit it. The local validator checks syntax, not whether a parent exists.
- Never commit secrets or restricted data. Confirm permissions, consent, licensing, visibility, and access terms before adding files; public GitHub releases expose source archives of tracked files.
- Document provenance, selection criteria, annotation methods, ownership, access terms, and usage in the dataset README and `task/` as appropriate. Do not invent facts to fill missing documentation.
- Use Node.js 22+ to run `node --test scripts/*.test.mjs` and `node scripts/validate-metadata.mjs` before proposing changes. Metadata CI runs on PRs and pushes to `main`; it does not inspect dataset contents.
- Use branches and PRs for reviewed changes. Use Conventional Commit titles for squash merges (`feat(data): ...`, `fix(data): ...`); do not merge a PR or publish a release without the repository owner's approval.
- Release Please runs only after successful validation of a push to `main`. Review its generated release PR; because `GITHUB_TOKEN`-created PRs do not automatically trigger CI, manually run **Validate metadata** on the release branch and inspect the result before merging. Do not hand-edit generated release files except for the one-time reset below when creating a dataset repository.

## When maintaining the template

- Keep example metadata and task files clearly labelled as examples; never substitute an invented real dataset or lineage.
- If metadata validation or release behavior changes, update the relevant tests, workflows, and README together. Preserve separate validation and release workflows and the built-in `GITHUB_TOKEN` unless the owner approves a different design.
- Changes to this template affect future repositories, not existing copies. Verify local tests and PR CI; do not treat a passing metadata check as proof that release automation or dataset access is correct.

## When working in a repository made from the template

- Replace the example `metadata.json`, README, and `task/README.md` with truthful, public-safe dataset information before publishing.
- Before the first dataset release, reset `.release-please-manifest.json` to `{}` and remove any inherited `CHANGELOG.md`. The template's release history/version is not the dataset's; the first dataset release should start at `0.1.0`.
- Check that Actions may create PRs and that `main` is protected as appropriate before relying on Release Please. Catalogue publication and access review remain separate human decisions.
