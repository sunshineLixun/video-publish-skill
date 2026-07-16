# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow Semantic Versioning.

## [Unreleased]

### Added

- Open-source governance, security, contribution, CI, and release documentation.
- Reproducible pnpm 11 toolchain with the current npm vulnerability-audit endpoint.

### Changed

- Development and CI now require Node.js 22.13+ because pnpm 11 uses the built-in `node:sqlite`
  module; the bundled Skill CLI continues to target Node.js 20.
- Public documentation now separates the contributor development guide from the CLI reference and
  removes obsolete migration-oriented implementation notes.

## [0.1.0] - 2026-07-15

### Added

- Local-first Codex workflow for transcript-driven publishing copy and four cover ratios.
- Immutable local session and cover version contracts.
- Confirmed creator-page opening for six platforms.
- Ego Lite staging for Xiaohongshu, Douyin, Bilibili, and WeChat Channels.
- Real topic/tag verification, original-declaration safeguards, cover mapping, interruption recovery,
  and a hard guard against final publishing.
