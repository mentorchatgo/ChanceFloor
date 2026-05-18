import fs from 'fs';

let content = fs.readFileSync('src/components/UI.tsx', 'utf8');

content = content.replace(/\btext-6xl\b/g, 'text-7xl');
content = content.replace(/\btext-5xl\b/g, 'text-6xl');
content = content.replace(/\btext-4xl\b/g, 'text-5xl');
content = content.replace(/\btext-3xl\b/g, 'text-4xl');
content = content.replace(/\btext-2xl\b/g, 'text-4xl'); // 3xl skipped purposely or just mapping
content = content.replace(/\btext-xl\b/g, 'text-2xl');
content = content.replace(/\btext-lg\b/g, 'text-xl');
content = content.replace(/\btext-base\b/g, 'text-lg');
content = content.replace(/\btext-sm\b/g, 'text-base');
content = content.replace(/\btext-xs\b/g, 'text-sm');

fs.writeFileSync('src/components/UI.tsx', content);

