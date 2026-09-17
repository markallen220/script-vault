# ALLEN OS · VAULT

Single-file script library and practice app. Existing site: https://markallen220.github.io/script-vault/

## Development

`index.html` contains the HTML shell, CSS, embedded icons, seed scripts, and vanilla JavaScript. There are no application dependencies or build step. Work on a feature branch and review the diff before changing the published branch. Do not replace this source with a browser's Save Page As export.

Run the source-level regression tests with Node.js 22 or later:

```sh
node backup.test.cjs
```

The tests cover backup integrity, audio-byte preservation, validation, partial-write rollback, interrupted recovery, transaction commit/abort handling, and preservation of the existing starter scripts and CSS. They use disposable data and simulated storage; real-browser checks are still required.

## Backup and restore

The backup feature in this branch is not yet published to the live site.

1. Stop recording and click **Backup** in the top bar.
2. Verify that the displayed script and recording counts match the vault you intend to save.
3. Click **Download backup**, then verify that the JSON file actually saved in Downloads.

Backups contain scripts and metadata, mastery and practice progress, streak, score data, and audio recordings. Treat them as personal data. They are not encrypted and must not be committed to this public repository.

To restore, select a VAULT backup JSON file, review its counts, download the current vault for recovery, and confirm that the recovery file is saved and other VAULT tabs are closed. **Restore replaces the current library; it does not merge libraries.** The app validates the file and verifies the saved result. The file-size limit is 256 MB.

An internal browser recovery copy is committed before replacement begins. Failed restores attempt rollback; an interrupted restore is recovered when this updated app next opens at the same address in the same browser. If recovery cannot finish, retain browser data and the downloaded recovery file, then reload to retry. Do not clear site data or switch back to old code while recovery is pending.

## Storage and privacy

- Scripts: `localStorage["vault.scripts.v3"]`
- Scores: `localStorage["vault.scores.v1"]`
- Streak: `localStorage["vault.streak.v1"]`
- Recordings: IndexedDB `vaultTakes`, version 1, `takes` store
- Pending restore recovery: IndexedDB `allenVaultRecovery`, version 1, `recovery` store

The app does not upload these records or audio to GitHub. Hosting does not provide data backup or cross-device sync. Browser profiles and site origins have separate storage; local HTML files may have different data from the hosted site. Other apps on the same GitHub Pages origin can share its browser storage namespace.

Keep the current site address and storage keys stable. Identify the browser/address with the working vault before migrating data. A source-code copy is not a backup of browser data.

## Before publishing this branch

- Verify Backup and restore in a disposable browser profile, including download, import, reload, audio playback, malformed-file handling, and available-space failures.
- Check Browse, Flow, Drill, Objections, Search, Live Call, and recording behavior.
- Inspect desktop and phone layouts, including the new header control and restore confirmation.
- Locate and preserve the existing user's saved data. Do not assume the 14 starter scripts are the complete working library.

## Five refinements (development branch)

This branch builds on the unpublished backup/recovery branch. Preserve the existing starter scripts and visual system; no framework or service was added.

- Browse includes lead-type call shortcuts and an early Start call action. These go directly to the first step; the existing Live Call action still opens tonality preparation.
- Drill includes a session of up to three weakest/stalest scripts, explicit rep completion, self-ratings, improvement notes, completion feedback, and a review of the latest saved session. Closing midway preserves completed reps only.
- Ratings now control both confidence flags. The streak uses local calendar dates and displays zero after a missed day. Previously stored UTC dates cannot be reconstructed and are retained as recorded; future practice uses local dates. Revealing an ambush answer no longer counts as practice.
- Edit script preserves IDs, recordings, progress, and custom fields. The latest previous content can be previewed and restored. Up to ten content snapshots are retained per script and included in backups. Restoring a previous version makes the replaced content available as the next previous version. The UI currently exposes the most recent snapshot, not a full historical version picker.
- Ratings are labeled buttons with 44px targets. Zoom is enabled, dialogs support Escape and Tab focus containment, and underlying controls are inert while a dialog is open. The floating objection control is hidden on Training. Recording blocks navigation until stopped and saved, including pending permission and saving states; reload/close requests trigger the browser's standard unsaved-work warning where supported.

Practice sessions use the existing scores collection; revision snapshots are metadata on the existing script records. No storage keys or database versions changed. Backup JSON remains version 1.

Run both suites:

```sh
node backup.test.cjs
node refinements.test.cjs
```

Verified: 24 automated tests, browser call entry and objection return, three-rep session and reload persistence, edit and previous-version restoration across reload, keyboard rating and dialog focus containment, and 390px/1440px layout checks. Browser console showed no warnings/errors during those interactions.

Still required before release: real microphone stop/save/navigation verification, audible playback in a normal browser (the earlier in-app player crashed), and a confirmed export of the user's actual working library. Test storage used synthetic or starter content, not the user's working vault. Keep this branch unmerged until those release checks and review are complete.
