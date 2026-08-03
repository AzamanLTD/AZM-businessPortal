// scripts/fix-toast-imports.mjs
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.jsx', { ignore: ['src/lib/toast.jsx', 'src/components/instrument/**'] });
let changed = 0;
const flaggedForManualReview = [];

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  if (!src.includes("from 'sonner'")) continue;

  const before = src;

  // 1. import line
  src = src.replace(/import\s*\{\s*toast\s*\}\s*from\s*'sonner';?/g, "import { toast } from '@/lib/toast';");
  src = src.replace(/import\s*\{\s*Toaster\s*\}\s*from\s*'sonner';?\s*\n?/g, '');

  // 2. method renames (only these three exist in the codebase per audit — verified via grep)
  src = src.replace(/\btoast\.success\(/g, 'toast.go(');
  src = src.replace(/\btoast\.error\(/g, 'toast.stop(');
  src = src.replace(/\btoast\.info\(/g, 'toast.neutral(');

  // 3. safety net — flag anything this script doesn't know how to handle
  if (/toast\.(loading|promise|custom|dismiss)\(/.test(src)) {
    flaggedForManualReview.push(file);
  }

  if (src !== before) {
    writeFileSync(file, src, 'utf8');
    changed++;
  }
}

console.log(`Updated ${changed} files.`);
if (flaggedForManualReview.length) {
  console.log('\n⚠ These files use a toast method not covered by this script — open them and handle by hand:');
  flaggedForManualReview.forEach((f) => console.log('  -', f));
} else {
  console.log('No files need manual review.');
}
