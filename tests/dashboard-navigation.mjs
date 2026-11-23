import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.KB_PLAYWRIGHT_MODULE);
const origin = 'http://127.0.0.1:3200';
const password = 'Local-navigation-test-123!';
const flows = {
  farmer: [['Market Finder','market-finder'], ['Storage Finder','storage-finder'], ['Harvest & Storage','harvest-services'],
    ['My Farms','farms'], ['AI Crop Doctor','crop-doctor'], ['Disease History','crop-doctor/history'],
    ['Profile','profile'], ['My Crops','crops'], ['Job Board','jobs'], ['Products','products'], ['Orders','orders'],
    ['Harvest Requests','harvest-requests'], ['Weather','weather'], ['AI Advisory','advisory'], ['Government Schemes','schemes']],
  buyer: [['Marketplace','marketplace'], ['My Orders','orders'], ['Profile','profile']],
  worker: [['Find Jobs','jobs'], ['My Applications','applications'], ['Profile','profile'],
    ['Offer Harvest Services','services'], ['Harvest & Storage','harvest-services']],
  admin: [['Harvest & Storage Review','harvest-services']],
};

async function seed(role) {
  const email = randomUUID() + '@example.test';
  const signup = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const { localId: uid } = await signup.json();
  assert.ok(uid);
  const fields = Object.fromEntries(Object.entries({ uid, name: 'Navigation ' + role, email, role })
    .map(([key,value]) => [key, { stringValue: value }]));
  const response = await fetch(`http://127.0.0.1:8080/v1/projects/demo-krishibandhu/databases/(default)/documents/users/${uid}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { ...fields, isActive: { booleanValue: true }, isVerified: { booleanValue: false },
      createdAt: { timestampValue: new Date().toISOString() }, updatedAt: { timestampValue: new Date().toISOString() } } }),
  });
  assert.ok(response.ok, await response.text());
  return email;
}

const exampleProduct = 'navigation-' + randomUUID();
const productFields = Object.fromEntries(Object.entries({
  name: 'Navigation test coconut', status: 'active', category: 'fruit', unit: 'kg',
  farmerName: 'Example farmer', description: 'Emulator test product', farmerDistrict: 'North Goa', farmerState: 'Goa',
}).map(([key, value]) => [key, { stringValue: value }]));
const productResponse = await fetch(`http://127.0.0.1:8080/v1/projects/demo-krishibandhu/databases/(default)/documents/products/${exampleProduct}`, {
  method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { ...productFields, price: { integerValue: '250' },
    quantityAvailable: { integerValue: '10' }, createdAt: { timestampValue: new Date().toISOString() } } }),
});
assert.ok(productResponse.ok, await productResponse.text());

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const nav = () => page.getByRole('navigation', { name: 'Dashboard navigation', exact: true });
  const assertPath = path => page.waitForURL(url => url.pathname === path, { timeout: 10000 });
  const active = () => nav().locator('[aria-current="page"]');
  const drawer = () => page.getByRole('dialog', { name: 'Dashboard menu' });
  const opener = () => page.getByRole('button', { name: 'Open sidebar' });
  const login = async (role) => {
    await page.goto(origin + '/login');
    await page.getByLabel('Email address').fill(await seed(role));
    await page.locator('input[type=password]').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await assertPath('/' + role);
    await nav().waitFor();
  };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  for (const route of ['/', '/marketplace', '/jobs', '/market-finder', '/storage-finder', '/harvest-services']) {
    assert.equal((await page.goto(origin + route)).status(), 200);
    assert.equal(await nav().count(), 0);
    assert.equal(await page.getByRole('banner').count(), 1);
  }
  await page.goto(origin + '/buyer/orders');
  await assertPath('/login');

  for (const [role, steps] of Object.entries(flows)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(role);
    for (const [label, path] of steps) {
      await nav().getByRole('link', { name: label, exact: true }).click();
      await assertPath(`/${role}/${path}`);
      await active().waitFor();
      assert.equal(await active().count(), 1);
      assert.equal(await active().innerText(), label);
      assert.equal(await page.getByRole('banner').count(), 1);
      assert.equal(await overflow(), false, `Overflow at /${role}/${path}`);
    }
    if (role === 'buyer') {
      await nav().getByRole('link', { name: 'Marketplace', exact: true }).click();
      await page.locator(`a[href="/buyer/marketplace/${exampleProduct}"]`).click();
      await assertPath('/buyer/marketplace/' + exampleProduct);
      assert.equal(await active().innerText(), 'Marketplace');
      await page.reload();
      await page.getByRole('link', { name: 'Back to Marketplace' }).click();
      await assertPath('/buyer/marketplace');
      await nav().getByRole('link', { name: 'Profile', exact: true }).click();
      await assertPath('/buyer/profile');
    }
    await page.reload();
    await nav().waitFor();
    const last = steps.at(-1)[1];
    await assertPath(`/${role}/${last}`);
    await nav().getByRole('link', { name: 'Dashboard', exact: true }).click();
    await assertPath('/' + role);
    await page.goBack();
    await assertPath(`/${role}/${last}`);
    await page.goForward();
    await assertPath('/' + role);
    await page.goto(origin + (role === 'buyer' ? '/farmer/farms' : '/buyer/profile'));
    await assertPath('/' + role);
    for (const width of [1024, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 700 });
      assert.equal(await overflow(), false, `Overflow at /${role}, ${width}px`);
      if (width === 1024) { await nav().waitFor(); continue; }
      await opener().click();
      await drawer().waitFor();
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      if (role === 'farmer' && width === 360) {
        const menu = drawer().getByRole('navigation');
        await menu.evaluate(element => { element.scrollTop = element.scrollHeight; });
        assert.ok(await menu.evaluate(element => element.scrollTop > 0));
      }
      await page.keyboard.press('Escape');
      await drawer().waitFor({ state: 'hidden' });
      await opener().click();
      await page.mouse.click(width - 3, 200);
      await drawer().waitFor({ state: 'hidden' });
      await opener().click();
      await drawer().getByRole('link', { name: steps[0][0], exact: true }).click();
      await assertPath(`/${role}/${steps[0][1]}`);
      await drawer().waitFor({ state: 'hidden' });
      assert.equal(await overflow(), false, `Overflow at /${role}/${steps[0][1]}, ${width}px`);
      await page.goBack();
      await assertPath('/' + role);
    }
    await opener().click();
    await drawer().getByRole('button', { name: 'Sign out' }).click();
    await assertPath('/login');
    console.log(role + ' navigation passed');
  }
} finally {
  await browser.close();
}
