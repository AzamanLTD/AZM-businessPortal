import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/main.jsx',
  'src/App.jsx',
  'src/lib/AuthContext.jsx',
  'src/lib/query-client.js',
  'src/pages/Dashboard.jsx',
  'src/pages/Orders.jsx',
  'src/pages/FinanceV2.jsx',
];

const app = await readFile('src/App.jsx', 'utf8');
const main = await readFile('src/main.jsx', 'utf8');

for (const file of requiredFiles) {
  try {
    await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`Business Portal smoke check: required file missing: ${file}`);
  }
}

const requiredRoutes = [
  'path="/"',
  'path="/orders"',
  'path="/finance"',
  'path="/notifications"',
  'path="/settings"',
];

for (const route of requiredRoutes) {
  if (!app.includes(route)) {
    throw new Error(`Business Portal smoke check: required route missing: ${route}`);
  }
}

if (!main.includes('<App />')) {
  throw new Error('Business Portal smoke check: main.jsx does not mount App.');
}

if (!app.includes('<AuthProvider>') || !app.includes('<QueryClientProvider')) {
  throw new Error('Business Portal smoke check: application providers are not mounted.');
}

console.log(`Business Portal smoke checks passed (${requiredFiles.length} required files, ${requiredRoutes.length} critical routes).`);
