# Targeted Firestore rules candidate

This package targets the default Firestore database in `krishibandhu-a500e`. `release.json` identifies the deployed baseline reviewed for this candidate. `candidate.diff` is the exact unified diff from that deployed release. The candidate covers farm sync, private text assessment creation and history, eligible job and directory workflows, and order requests.

`firebase.candidate.json` selects `candidate.rules` for an explicitly approved rules-only deployment. Recheck the live release before deploying to avoid overwriting changes made since the review. The four missing composite definitions used by the current pages are in `missing-indexes.json`. After approval, create each missing definition with a single create operation and wait for READY. Recheck live index signatures first. The following PowerShell reads only that add-list and issues create commands, one per definition.

```powershell
$indexes = Get-Content -Raw deploy/firestore-targeted/missing-indexes.json | ConvertFrom-Json
foreach ($index in $indexes) {
  $fields = @($index.fields | ForEach-Object {
    '--field-config=field-path=' + $_.fieldPath + ',order=' + $_.order.ToLowerInvariant()
  })
  gcloud.cmd firestore indexes composite create --project=krishibandhu-a500e '--database=(default)' --query-scope=collection "--collection-group=$($index.collectionGroup)" @fields
  if ($LASTEXITCODE -ne 0) { break }
}
```

After a separate rules approval and a baseline recheck, the rules-only command is `firebase.cmd deploy --only firestore:rules --project krishibandhu-a500e --config deploy/firestore-targeted/firebase.candidate.json`.

The farm and history checks use the active role in the UID-keyed user profile. Buyers can request an active product at its listed price. Pending requests reserve no units. Seller acceptance atomically deducts stock and records the order ID on the product. Existing orders retain their original stock behavior. Marketplace owners can create products with image references and replace or clear the image list, as allowed by the deployed rules. This applies to Firestore metadata only. Worker listing edits return to moderation. Public facility queries require an active approved entry. Directory imports, moderation, and enquiries retain their distinct role requirements. Firestore reads, writes, and index storage consume project quota. The candidate requires no additional paid service.

Run the emulator and permission checks from the repository root in separate terminals.

```powershell
firebase.cmd emulators:start --only firestore --project demo-krishibandhu --config deploy/firestore-targeted/firebase.candidate.json
node --experimental-strip-types deploy/firestore-targeted/check-candidate.mjs
```
