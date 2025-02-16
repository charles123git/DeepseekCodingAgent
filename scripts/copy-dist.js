import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../dist/public');
const destDir = path.resolve(__dirname, '../server/public');

// Create the destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy files from dist/public to server/public
fs.cpSync(srcDir, destDir, { recursive: true });
console.log('Successfully copied built files to server/public');
