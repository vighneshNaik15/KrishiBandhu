import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.KB_PLAYWRIGHT_MODULE);
const origin = 'http://127.0.0.1:3200';
const password = 'Disposable-test-only-358!';
const suffix = randomUUID().slice(0, 8);
const date = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
const farmName = `Coconut plot ${suffix}`;
const cropName = `Coconut crop ${suffix}`;
const productName = `Coconut boxes ${suffix}`;
const jobTitle = `Farm job ${suffix}`;
const village = `Bardez ${suffix}`;
const harvestTitle = `Tractor Rental in ${village}`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const button = (page, name) => page.getByRole('button', { name, exact: true });
const heading = (page, name) => page.getByRole('heading', { name, exact: true });
const label = (page, name) => page.getByLabel(name, { exact: true })
  .or(page.getByLabel(name + '*', { exact: true }))
  .or(page.getByLabel(name + ' *', { exact: true }));
const fill = (page, field, value) => label(page, field).fill(value);
const select = (page, field, name) => label(page, field).selectOption({ label: name });
const go = (page, path) => page.goto(origin + path);
const path = (page, route) => page.waitForURL(url => url.pathname === route);

async function testPage() {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue()
    : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return page;
}

async function register(role) {
  const page = await testPage();
  await go(page, `/register/${role}`);
  const name = `${role} ${suffix}`;
  const email = `${role}-${suffix}@example.test`;
  await fill(page, 'Full name', name);
  await fill(page, 'Email address', email);
  if (role !== 'buyer') {
    await fill(page, 'Mobile number', '9876543210');
    await select(page, 'District', 'North Goa');
  }
  await fill(page, 'Password', password);
  await fill(page, 'Confirm password', password);
  await page.locator('form button[type="submit"]').click();
  await path(page, `/${role}`);
  return { page, name, email };
}

async function adminPage() {
  const email = `admin-${suffix}@example.test`;
  const signup = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const { localId: uid } = await signup.json();
  assert.ok(uid);
  const fields = {
    uid: { stringValue: uid }, email: { stringValue: email }, role: { stringValue: 'admin' },
    name: { stringValue: 'Workflow administrator' }, isActive: { booleanValue: true },
    createdAt: { timestampValue: new Date().toISOString() },
  };
  const profile = await fetch(`http://127.0.0.1:8080/v1/projects/demo-krishibandhu/databases/(default)/documents/users/${uid}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  assert.ok(profile.ok, await profile.text());
  const page = await testPage();
  await go(page, '/login');
  await fill(page, 'Email address', email);
  await fill(page, 'Password', password);
  await button(page, 'Sign in').click();
  await path(page, '/admin');
  return page;
}

async function jobIdAfterSubmit(page) {
  await page.waitForURL(url => /^\/farmer\/jobs\/(?!new$)[^/]+$/.test(url.pathname));
  return new URL(page.url()).pathname.split('/').at(-1);
}

try {
  const { page: farmer, name: farmerName, email: farmerEmail } = await register('farmer');
  const { page: buyer } = await register('buyer');
  const { page: worker, name: workerName } = await register('worker');
  console.log('Farmer, buyer, and worker registered through the UI');

  await go(farmer, '/farmer/farms');
  await button(farmer, 'Add Farm').click();
  await fill(farmer, 'Farm name', farmName);
  await fill(farmer, 'Area', '2.25');
  await select(farmer, 'District', 'North Goa');
  await button(farmer, 'Save Farm').click();
  await heading(farmer, farmName).waitFor();
  await farmer.getByRole('status').filter({ hasText: /^Online(?: \| Offline access ready)?$/ }).waitFor();
  await go(farmer, '/farmer/crops/new');
  await select(farmer, 'Farm', farmName);
  await fill(farmer, 'Crop name', cropName);
  await select(farmer, 'Category', 'Other Fruits');
  await fill(farmer, 'Cultivated Area', '1.5');
  await button(farmer, 'Save Crop').click();
  await path(farmer, '/farmer/crops');
  await farmer.getByText(cropName, { exact: true }).waitFor();
  await farmer.reload();
  await farmer.getByText(cropName, { exact: true }).waitFor();
  await go(farmer, '/farmer/farms');
  await heading(farmer, farmName).click();
  await farmer.getByText(cropName, { exact: true }).waitFor();
  console.log('Farm creation, crop creation, and reload passed');

  await go(farmer, '/farmer/products/new');
  await fill(farmer, 'Product name', productName);
  await select(farmer, 'Category', 'Fruits');
  await fill(farmer, 'Description', 'Fresh coconuts from a local farm.');
  await fill(farmer, 'Price (₹)', '149.50');
  await fill(farmer, 'Available quantity', '30');
  await select(farmer, 'District', 'North Goa');
  await button(farmer, 'List Product').click();
  await path(farmer, '/farmer/products');
  await farmer.getByText(productName, { exact: true }).waitFor();
  await go(buyer, '/buyer/marketplace');
  await fill(buyer, 'Search marketplace', farmerName);
  await select(buyer, 'Product category', 'Fruits');
  await buyer.getByRole('link', { name: new RegExp(productName) }).click();
  await buyer.waitForURL(url => url.pathname.startsWith('/buyer/marketplace/'));
  await heading(buyer, productName).waitFor();
  await buyer.reload();
  await heading(buyer, productName).waitFor();
  await buyer.getByText('₹149.50', { exact: true }).waitFor();
  await buyer.getByText('Online order requests are currently unavailable.').waitFor();
  console.log('Decimal-priced product listing, seller search, and buyer product reload passed');

  await go(farmer, '/farmer/jobs/new');
  await fill(farmer, 'Job title', jobTitle);
  await fill(farmer, 'Description', 'Help with harvesting and sorting coconuts.');
  await select(farmer, 'Work category', 'Coconut Harvesting');
  await select(farmer, 'District', 'North Goa');
  await fill(farmer, 'Start date', date);
  await farmer.getByRole('checkbox', { name: /Publish immediately/ }).uncheck();
  await button(farmer, 'Post Job').click();
  const jobId = await jobIdAfterSubmit(farmer);
  await button(farmer, 'Publish Job').click();
  await farmer.getByText('Published', { exact: true }).waitFor();
  await go(worker, `/worker/jobs/${jobId}`);
  const secondWorkerTab = await worker.context().newPage();
  await go(secondWorkerTab, `/worker/jobs/${jobId}`);
  await button(secondWorkerTab, 'Submit Application').waitFor();
  await Promise.all([button(worker, 'Submit Application').click(), button(secondWorkerTab, 'Submit Application').click()]);
  await worker.getByText(/awaiting review/).waitFor();
  await secondWorkerTab.getByText(/awaiting review/).waitFor();
  await secondWorkerTab.close();
  await worker.reload();
  await worker.getByText(/awaiting review/).waitFor();
  assert.equal(await button(worker, 'Submit Application').count(), 0);
  await farmer.reload();
  await button(farmer, 'Accept').waitFor();
  assert.equal(await button(farmer, 'Accept').count(), 1);
  await button(farmer, 'Accept').click();
  await farmer.getByText('Worker Selected', { exact: true }).waitFor();
  console.log('Job draft, publication, application persistence, and applicant selection passed');

  await go(farmer, '/farmer/harvest-requests/new');
  await select(farmer, 'Required service', 'Tractor Rental');
  await fill(farmer, 'Crop type', 'Coconut');
  await fill(farmer, 'Approximate land area', '2.25');
  await fill(farmer, 'Work instructions', 'Bring a tractor suitable for a small farm.');
  await fill(farmer, 'Taluka', 'Bardez');
  await fill(farmer, 'Village', village);
  await fill(farmer, 'Farm location or landmark', 'Near the village hall');
  await fill(farmer, 'Required date', date);
  await select(farmer, 'Need', 'Machinery/equipment');
  await button(farmer, 'Publish request').click();
  const harvestId = await jobIdAfterSubmit(farmer);
  await heading(farmer, harvestTitle).waitFor();
  await go(buyer, '/jobs');
  await fill(buyer, 'Search jobs', harvestTitle);
  await buyer.getByText('1 equipment needed', { exact: true }).waitFor();
  await go(worker, `/worker/jobs/${harvestId}`);
  await button(worker, 'Submit Application').click();
  await worker.getByText(/awaiting review/).waitFor();
  await farmer.reload();
  await button(farmer, 'Accept').click();
  await button(farmer, 'Confirm schedule').click();
  await farmer.getByText('Scheduled', { exact: true }).waitFor();
  await worker.reload();
  await button(worker, 'Mark work started').click();
  await button(worker, 'Submit work for completion confirmation').click();
  await worker.getByText(/awaiting confirmation/).waitFor();
  await farmer.reload();
  await button(farmer, 'Confirm completion').click();
  await farmer.getByText('Completed', { exact: true }).waitFor();
  await worker.reload();
  await worker.getByText(/confirmed this work as completed/).waitFor();
  console.log('Machinery request publication, scheduling, progress, and completion passed');

  await go(buyer, '/buyer/profile');
  await fill(buyer, 'Full name', `Updated buyer ${suffix}`);
  await button(buyer, 'Save profile').click();
  await buyer.getByText('Profile saved.').waitFor();
  await buyer.reload();
  assert.equal(await label(buyer, 'Full name').inputValue(), `Updated buyer ${suffix}`);
  console.log('Buyer profile edit and reload passed');

  await go(worker, '/worker/jobs');
  assert.equal(await label(worker, 'District').inputValue(), 'North Goa');
  await go(worker, '/worker/services');
  await worker.getByRole('checkbox', { name: 'Tractor Rental' }).check();
  await fill(worker, 'Taluka', 'Bardez');
  await fill(worker, 'Skills (comma-separated)', 'Tractor operation');
  await fill(worker, 'Availability', 'Weekdays');
  await fill(worker, 'Service description', 'Tractor hire and field preparation for local farms.');
  await button(worker, 'Submit service listing').click();
  await worker.getByText('Pending admin review', { exact: true }).waitFor();
  const admin = await adminPage();
  await go(admin, '/admin/harvest-services');
  const provider = heading(admin, workerName).locator('xpath=../../..');
  await button(provider, 'Approve').click();
  await admin.getByText('Provider listing approved.').waitFor();
  await worker.reload();
  await worker.getByText('Approved', { exact: true }).waitFor();
  console.log('Worker location and provider submission, admin approval, and reload passed');

  const storageName = 'Tropical Mushrooms (Goa) Pvt. Ltd.';
  const imported = heading(admin, storageName);
  if (!(await imported.count())) await button(admin, 'Import provisional leads').click();
  await imported.waitFor();
  const fixture = await fetch('http://127.0.0.1:8080/v1/projects/demo-krishibandhu/databases/(default)/documents/storageFacilities/tropical-mushrooms-goa?updateMask.fieldPaths=verificationStatus', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { verificationStatus: { stringValue: 'pending' } } }),
  });
  assert.ok(fixture.ok, await fixture.text());
  await go(farmer, '/farmer/harvest-services');
  await farmer.getByRole('tab', { name: 'Cold Storage Finder' }).click();
  await select(farmer, 'District', 'North Goa');
  await fill(farmer, 'Search storage', storageName);
  await button(farmer, 'Send enquiry').click();
  await fill(farmer, 'Commodity', 'Coconuts');
  await fill(farmer, 'Quantity', '25');
  await fill(farmer, 'Unit', 'kg');
  await fill(farmer, 'Preferred start date', date);
  const message = `Storage follow-up requested for test ${suffix}.`;
  await fill(farmer, 'Details', message);
  await button(farmer, 'Submit enquiry').click();
  await farmer.getByText(/Your enquiry was sent/).waitFor();
  await admin.reload();
  const enquiry = admin.getByText(message, { exact: true }).locator('xpath=../../..');
  await button(enquiry, 'Mark reviewed').click();
  await admin.getByText('Enquiry marked reviewed.').waitFor();
  await button(enquiry, 'Close').click();
  await admin.getByText('Enquiry closed.').waitFor();
  console.log('Storage enquiry submission and admin review passed');

  await button(imported.locator('xpath=../../..'), 'Reject').click();
  await admin.getByText('Facility status updated to rejected.').waitFor();
  await farmer.reload();
  await farmer.getByRole('tab', { name: 'Cold Storage Finder' }).click();
  await select(farmer, 'District', 'North Goa');
  await fill(farmer, 'Search storage', storageName);
  await heading(farmer, 'No records match these filters').waitFor();
  assert.equal(await heading(farmer, storageName).count(), 0);
  console.log('Rejected imported lead stayed hidden in the public directory');

  if (process.env.KB_CROP_TEST_IMAGE) {
    await go(farmer, '/farmer/crop-doctor');
    await farmer.getByRole('combobox').selectOption('rice');
    await farmer.locator('input[type="file"]').first().setInputFiles(process.env.KB_CROP_TEST_IMAGE);
    await button(farmer, 'Analyze Crop').click();
    await farmer.getByText(/possible model label/).waitFor();
    await button(farmer, 'Save report').waitFor();
    assert.equal(await button(farmer, 'Save report').isEnabled(), false);
    console.log('Crop Doctor browser prediction passed');
  }

  if (process.env.KB_LIVE_WEATHER === '1') {
    await go(farmer, '/farmer/weather');
    await fill(farmer, 'Search or change weather location', 'Panjim');
    const geocoding = farmer.waitForResponse(response => new URL(response.url()).pathname === '/api/weather/geocode');
    await button(farmer, 'Search location').click();
    const locationResponse = await geocoding;
    assert.equal(new URL(locationResponse.url()).searchParams.get('q'), 'Panjim');
    assert.ok(locationResponse.ok());
    await farmer.getByRole('button', { name: /Panjim.*Goa/ }).click();
    await heading(farmer, '7-day forecast').waitFor();
    console.log('Live weather location search and forecast passed');
  }

  await go(farmer, '/farmer/market-finder');
  await select(farmer, 'State', 'Maharashtra');
  await select(farmer, 'District', 'Ahmednagar');
  await select(farmer, 'Commodity group', 'Vegetables');
  await heading(farmer, 'Ahmednagar').waitFor();
  await go(farmer, '/farmer/storage-finder');
  await select(farmer, 'District', 'Ahmednagar');
  await heading(farmer, 'Trimurti Foodtech Pvt Ltd').waitFor();
  console.log('Market Finder and Storage Finder dataset filters passed');

  const mappedFarm = `Mapped plot ${suffix}`;
  await go(farmer, '/farmer/farms');
  await button(farmer, 'Add Farm').click();
  await fill(farmer, 'Farm name', mappedFarm);
  await select(farmer, 'District', 'North Goa');
  const map = farmer.locator('.leaflet-container');
  await map.click({ position: { x: 70, y: 100 } });
  await map.click({ position: { x: 120, y: 100 } });
  await map.click({ position: { x: 120, y: 140 } });
  assert.ok(Number((await label(farmer, 'Mapped area').inputValue()).replaceAll(',', '')) > 0);
  await button(farmer, 'Save Farm').click();
  await heading(farmer, mappedFarm).click();
  await heading(farmer, 'Farm boundary').waitFor();
  await farmer.locator('.leaflet-overlay-pane path.leaflet-interactive').waitFor();
  console.log('Map drawing, area calculation, and saved boundary rendering passed');

  const passwordReset = await testPage();
  await go(passwordReset, '/forgot-password');
  await fill(passwordReset, 'Email address', farmerEmail);
  await passwordReset.locator('form button[type="submit"]').click();
  await heading(passwordReset, 'Check your email').waitFor();
  console.log('Password reset request passed with the Auth emulator');
} finally {
  await browser.close();
}
