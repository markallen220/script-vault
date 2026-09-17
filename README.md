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

Keep changes to the existing design and script content out of this milestone. Editing existing scripts remains a separate follow-up; this branch only adds backup/recovery and supporting persistence safeguards.
