#!/bin/bash

# Get current version from package.json
current_version=$(node -p "require('./package.json').version")

# Split version into components
IFS='.' read -ra VERSION_PARTS <<< "$current_version"
major=${VERSION_PARTS[0]}
minor=${VERSION_PARTS[1]}
patch=${VERSION_PARTS[2]}

# Parse command line option
case "$1" in
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  patch|*)
    patch=$((patch + 1))
    ;;
esac

# New version
new_version="$major.$minor.$patch"

# Update package.json
sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json

echo "Version bumped from $current_version to $new_version"

# Git operations
git add package.json
git commit -m "Bump version to $new_version"
git tag "v$new_version"
git push && git push --tags