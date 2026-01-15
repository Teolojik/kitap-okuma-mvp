
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../src/components/ui');

if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
}

const files = fs.readdirSync(dir);

files.forEach(file => {
    if (!file.endsWith('.tsx')) return;

    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('from "src/lib/utils"')) {
        console.log(`Fixing ${file}...`);
        content = content.replace(/from "src\/lib\/utils"/g, 'from "@/lib/utils"');
        fs.writeFileSync(filePath, content, 'utf8');
    }
});

console.log('All files processed.');
