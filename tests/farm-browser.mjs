import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, serverTimestamp, doc, setDoc, updateDoc, getDocs,
  query, where, collection, deleteField } from 'firebase/firestore';

const { chromium } = await import(process.env.KB_PLAYWRIGHT_MODULE);
const origin = 'http://127.0.0.1:3200';
const password = 'Local-farm-test-123!';
const defineFarmer = async () => {
  const email = randomUUID() + '@example.test';
  const res = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email,password,returnSecureToken:true}) });
  const { localId: uid } = await res.json();
  assert.ok(uid, 'Auth emulator created a farmer');
  const app = initializeApp({projectId:'demo-krishibandhu'}, uid);
  const db = getFirestore(app);
  connectFirestoreEmulator(db,'127.0.0.1',8080,{mockUserToken:{sub:uid}});
  await setDoc(doc(db,'users',uid),{uid,name:'Browser Farmer',email,role:'farmer',isActive:true,
    isVerified:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  return {app,db,uid,email};
};

const farmer = await defineFarmer();
const other = await defineFarmer();
const browser = await chromium.launch({channel:'msedge', headless:true});
const context = await browser.newContext();
const page = await context.newPage();
page.on('dialog', dialog => void dialog.accept());
const wait = (locator) => locator.waitFor({timeout:15000});
const button = (name) => page.getByRole('button',{name,exact:true});
const status = (message) => page.getByRole('status').filter({hasText: message});
const login = async (who) => {
  await page.goto(origin + '/login');
  await page.getByLabel('Email address').fill(who.email);
  await page.locator('input[type=password]').fill(password);
  await button('Sign in').click();
  await page.waitForURL(url => url.pathname === '/farmer');
  await page.getByRole('link',{name:'My Farms',exact:true}).first().click();
  await wait(button('Add Farm'));
};
const create = async (name) => {
  await button('Add Farm').click();
  await page.getByLabel('Farm name').fill(name);
  await page.getByLabel('Area',{exact:true}).fill('1.25');
  await page.getByLabel('District').selectOption({label:'North Goa'});
  await button('Save Farm').click();
  await wait(page.getByRole('heading',{name,exact:true}));
};
const edit = async (from,to) => {
  await page.getByRole('heading',{name:from,exact:true}).click();
  await button('Edit').click();
  await page.getByLabel('Farm name').fill(to);
  await button('Save Farm').click();
  await wait(page.getByRole('heading',{name:to,exact:true}));
};
const records = () => getDocs(query(collection(farmer.db,'farms'),where('farmerId','==',farmer.uid),
  where('farmerUserId','==',farmer.uid)));
const poll = async (condition) => {
  for (let i=0; i<60; i++) { if(await condition()) return; await new Promise(r=>setTimeout(r,250)); }
  throw new Error('Server state did not converge');
};
try {
  await login(farmer);
  await wait(status('Offline access ready'));
  await create('Browser online plot');
  await edit('Browser online plot','Browser edited plot');
  await poll(async () => (await records()).docs.some(d=>d.data().name==='Browser edited plot'));
  await context.setOffline(true);
  await wait(status(/^Offline/));
  await page.reload({waitUntil:'domcontentloaded'});
  await wait(page.getByRole('heading',{name:'Browser edited plot',exact:true}));
  await create('Browser offline plot');
  await edit('Browser offline plot','Browser offline edited');
  await edit('Browser edited plot','Local conflicting edit');
  await wait(status('3 pending'));
  const old = (await records()).docs.find(d=>d.data().name==='Browser edited plot');
  await updateDoc(old.ref,{name:'Remote conflicting edit',mutationId:deleteField(),updatedAt:serverTimestamp()});
  await context.setOffline(false);
  await wait(page.getByText('This plot changed on another device.',{exact:false}));
  await poll(async () => (await records()).docs.filter(d=>d.data().name==='Browser offline edited').length === 1);
  await button('Use server version').click();
  await wait(page.getByRole('heading',{name:'Remote conflicting edit',exact:true}));
  const offline = (await records()).docs.find(d=>d.data().name==='Browser offline edited');
  await button('Delete farm').first().click();
  await poll(async () => (await records()).docs.some(d=>d.id===offline.id && !d.data().isActive));
  const keys = await page.evaluate(async () => {
    const stores = await caches.keys();
    return (await Promise.all(stores.map(async store => (await (await caches.open(store)).keys()).map(req=>new URL(req.url).pathname)))).flat();
  });
  assert.ok(keys.includes('/farmer/farms'));
  assert.ok(keys.every(key=>key==='/farmer/farms'||key.startsWith('/_next/static/')));
  const shell = await page.evaluate(async () => (await caches.match('/farmer/farms')).text());
  for (const privateValue of [farmer.email, farmer.uid, 'Remote conflicting edit', 'Browser offline edited']) {
    assert.equal(shell.includes(privateValue), false);
  }
  await button('Sign out').click();
  await page.waitForURL(url=>url.pathname==='/login');
  await login(other);
  await wait(page.getByText('No farms added yet',{exact:true}));
  assert.equal(await page.getByRole('heading',{name:'Remote conflicting edit',exact:true}).count(),0);
  assert.equal((await records()).docs.length,2);
  console.log('Authenticated Chromium workflow passed, including offline reload, conflict recovery, soft deletion and account switching.');
} catch(error) {
  console.error('Browser URL',page.url(), 'Visible content', (await page.locator('body').innerText()).slice(0,1400));
  throw error;
} finally {
  await browser.close();
  await Promise.all([deleteApp(farmer.app),deleteApp(other.app)]);
}
