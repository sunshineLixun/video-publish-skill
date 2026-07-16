#!/bin/sh

set -eu

repository="${VIDEO_PUBLISH_REPOSITORY:-sunshineLixun/video-publish-skill}"
ref="${VIDEO_PUBLISH_REF:-main}"
codex_home="${CODEX_HOME:-$HOME/.codex}"
destination="$codex_home/skills/prepare-video-publish"
archive_url="${VIDEO_PUBLISH_ARCHIVE_URL:-https://codeload.github.com/$repository/tar.gz/$ref}"
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/video-publish-install.XXXXXX")"
staged_directory=""
backup_directory=""

cleanup() {
  rm -rf "$temporary_directory"
  if [ -n "$staged_directory" ] && [ -e "$staged_directory" ]; then
    rm -rf "$staged_directory"
  fi
  if [ -n "$backup_directory" ] && [ -e "$backup_directory" ] && [ ! -e "$destination" ]; then
    mv "$backup_directory" "$destination"
  fi
}
trap cleanup EXIT HUP INT TERM

for command in curl tar; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done

printf 'Downloading Video Publish Skill (%s)...\n' "$ref"
curl --fail --location --retry 3 --silent --show-error "$archive_url" \
  --output "$temporary_directory/source.tar.gz"
tar -xzf "$temporary_directory/source.tar.gz" -C "$temporary_directory"

source_directory=""
for candidate in "$temporary_directory"/*/skills/prepare-video-publish; do
  if [ -d "$candidate" ]; then
    source_directory="$candidate"
    break
  fi
done

if [ -z "$source_directory" ]; then
  printf 'The downloaded archive does not contain prepare-video-publish.\n' >&2
  exit 1
fi

for required_file in \
  SKILL.md \
  scripts/video-publish.mjs \
  scripts/transcribe.py \
  scripts/ego-publisher/LICENSE.upstream; do
  if [ ! -f "$source_directory/$required_file" ]; then
    printf 'The downloaded Skill is incomplete: %s is missing.\n' "$required_file" >&2
    exit 1
  fi
done

destination_parent="$(dirname "$destination")"
mkdir -p "$destination_parent"
staged_directory="$destination_parent/.prepare-video-publish.install.$$"
backup_directory="$destination_parent/.prepare-video-publish.backup.$$"

if [ -e "$staged_directory" ] || [ -e "$backup_directory" ]; then
  printf 'Temporary install path already exists; retry the installation.\n' >&2
  exit 1
fi

mkdir "$staged_directory"
cp -R "$source_directory"/. "$staged_directory"

if [ -e "$destination" ] || [ -L "$destination" ]; then
  mv "$destination" "$backup_directory"
fi

mv "$staged_directory" "$destination"
staged_directory=""

if [ -n "$backup_directory" ] && [ -e "$backup_directory" ]; then
  rm -rf "$backup_directory"
fi
backup_directory=""

if ! command -v node >/dev/null 2>&1; then
  printf 'Installed successfully. Warning: Node.js 20+ was not found in PATH.\n' >&2
else
  printf 'Installed successfully.\n'
fi
printf 'Location: %s\n' "$destination"
