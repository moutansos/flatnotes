# Release and image publishing for this fork

This fork publishes container images to GitHub Container Registry (GHCR):

- `ghcr.io/moutansos/flatnotes`

Publishing is automated by GitHub Actions in `.github/workflows/publish-ghcr.yml`.

## What gets published

The workflow builds and pushes a multi-arch image (`linux/amd64`, `linux/arm64`) from `Dockerfile`.

Tags are generated as follows:

- `latest` when pushing to the repository default branch
- Branch tags when pushing branches (for example `develop`)
- Git tag names when pushing tags (for example `v1.3.0`)

## Triggering a release image

Use a Git tag that starts with `v` (for example `v1.3.0`) and push it:

```bash
git tag v1.3.0
git push origin v1.3.0
```

The workflow will publish `ghcr.io/moutansos/flatnotes:v1.3.0`.

## Manual publish

You can also run the workflow manually from the Actions tab using the `workflow_dispatch` trigger.

## Permissions

The workflow uses `GITHUB_TOKEN` with `packages: write` permission to push images to GHCR.

If package visibility or access needs to change, manage it in:

- `https://github.com/moutansos?tab=packages`
