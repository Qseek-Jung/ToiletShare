import fs from 'fs';
import path from 'path';

export function readFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

export function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
}

export function replaceContent(content, replacements) {
    let updatedContent = content;
    let count = 0;
    for (const [placeholder, value] of Object.entries(replacements)) {
        if (updatedContent.includes(placeholder)) {
            // Escape special regex chars if needed, but for simple placeholders it's fine
            const regex = new RegExp(placeholder, 'g');
            // If value is undefined/null, warn but don't crash, replace with empty
            const safeValue = value || '';
            updatedContent = updatedContent.replace(regex, safeValue);
            count++;
        }
    }
    return { content: updatedContent, count };
}

export function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error('.env file not found!');
        return {};
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const cleanLine = line.split('#')[0].trim();
        if (!cleanLine) return;

        const parts = cleanLine.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });
    return env;
}
