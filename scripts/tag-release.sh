#!/bin/bash
#
# Tag release script - creates and pushes a version tag based on package.json
# Pushing the tag triggers .github/workflows/create-release.yml and .github/workflows/publish-to-npm.yml
#
# Usage: pnpm run tag-release
#

set -e

# Check for uncommitted changes
if ! git diff --quiet HEAD; then
    echo "Error: uncommitted changes"
    exit 1
fi

git switch main
git pull --ff-only origin main

VERSION="v$(jq -r .version package.json)"

# Check if tag exists locally
if git tag -l "$VERSION" | grep -q "$VERSION"; then
    echo "Error: tag $VERSION already exists locally"
    exit 1
fi

# Check if tag exists on origin
if git ls-remote --tags origin | grep -q "refs/tags/$VERSION$"; then
    echo "Error: tag $VERSION already exists on origin"
    exit 1
fi

echo "Releasing $VERSION"

git tag "$VERSION"
git push origin "$VERSION"

echo "Released $VERSION"
