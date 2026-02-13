# Changelog

All notable changes to the Habit Tracker plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-02-13

### Added
- Date navigation controls to view and edit habits for past or future dates
- Left/Right arrow buttons to move between days
- "Today" button to quickly return to current date
- Visual indication when viewing a date other than today
- File watchers to automatically sync habit list when markdown notes are modified

### Changed
- Date display now highlights when viewing past/future dates
- Stats section title changes from "Today's Progress" to "Progress" when viewing other dates

### Fixed
- Habit list now updates automatically when habit markdown files are edited manually

## [0.1.0] - 2026-02-12

### Added
- Basic habit tracking with daily checkboxes
- Create, edit, and delete habits
- Habit descriptions and custom colors
- Streak tracking with consecutive day counting
- Progress bars showing daily completion percentage
- Habit history viewer with:
  - Statistics (current streak, total completions, completion rate)
  - 7-week calendar visualization
  - Recent completions list
- Archive/unarchive habits
- Note-based storage system (each habit stored as markdown file)
- Plugin settings:
  - Toggle streaks display
  - Toggle completion rate display
  - Week start day preference
  - Default habit color
  - Habits folder path
  - Habit suggestions
- Empty state with suggested habits
- Context menu for habit actions (edit, delete, view history, archive)
- Ribbon icon for quick access
- Commands for opening tracker and adding habits

[Unreleased]: https://github.com/ArctykDev/obsidian-habit-tracker/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ArctykDev/obsidian-habit-tracker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ArctykDev/obsidian-habit-tracker/releases/tag/v0.1.0
