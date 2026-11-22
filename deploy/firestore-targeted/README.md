# Targeted Firestore rules candidate

This package targets the default Firestore database in `krishibandhu-a500e`. `release.json` identifies the deployed baseline reviewed for this candidate. `candidate.diff` shows the changes to farm synchronization and owner-only Disease History reads.

`firebase.candidate.json` selects `candidate.rules` for an explicitly approved rules-only deployment. Recheck the live release before deploying to avoid overwriting changes made since the review. Create the missing `cropDiseaseAnalyses` index separately with a single-index creation operation using `disease-history-index.json` as the specification.

Run the emulator and permission checks from the repository root in separate terminals.

```powershell
firebase.cmd emulators:start --only firestore --project demo-krishibandhu --config deploy/firestore-targeted/firebase.candidate.json
node --experimental-strip-types deploy/firestore-targeted/check-candidate.mjs
```
