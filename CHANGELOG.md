# Changelog

All notable changes to this project are documented in this file. The format
follows Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-10-02

### Added

- Core: `start`, `apply`, `scopeOf`, `configure`. A theme scope (attribute,
  theme class or inline custom properties) is mirrored onto every portal
  root opened from inside it, kept in sync, released on removal.
- React: `FollowTheme` provider and `useFollowTheme(ref)` hook.
- Vue: `followtheme` plugin and `useFollowTheme(target)` composable.
