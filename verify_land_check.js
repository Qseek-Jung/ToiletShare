
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env directly to avoid complex parsing logic here, assuming user has valid env
// Or use hardcoded keys if safe, but better to read from .env.local or similar
// For this environment, we'll try to read from config.ts or .env.local logic, 
// but simply asking the code to run in current context is best.

// Let's implement a simple direct test assuming we can get keys from the files or process.env
// We'll read the config.ts file to find the keys? No, better to use the values the user likely has in .env
// We will attempt to read .env.local

let supabaseUrl = '';
let supabaseKey = '';

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const lines = envFile.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
        }
    }
} catch (e) {
    console.error("Could not read .env.local", e);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase keys not found in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPoint(name, lat, lng, expected) {
    const { data, error } = await supabase.rpc('check_is_on_land', { lat, lng });

    if (error) {
        console.error(`[FATAL] RPC Failure for ${name}:`, error.message);
        return false;
    }

    const result = !!data;
    const status = result === expected ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${name} (${lat}, ${lng}) -> IsLand: ${result} (Expected: ${expected})`);
    return result === expected;
}

async function runTests() {
    console.log("=== Starting PostGIS Land Verification Tests ===");

    // Test Cases
    const tests = [
        { name: "Seoul City Hall (Land)", lat: 37.5665, lng: 126.9780, expected: true },
        { name: "Jeju Island (Land)", lat: 33.3617, lng: 126.5292, expected: true },
        { name: "Dokdo (Land - may fail if simplistic polygon)", lat: 37.2429, lng: 131.8665, expected: true }, // Dokdo might be tricky depending on Natural Earth resolution
        { name: "East Sea (Sea)", lat: 37.5, lng: 130.0, expected: false },
        { name: "West Sea (Sea)", lat: 36.5, lng: 125.0, expected: false },
        { name: "South of Jeju (Sea within Box)", lat: 32.5, lng: 126.54, expected: false },
        { name: "Tsushima Island, Japan (Overseas)", lat: 34.4168, lng: 129.3353, expected: false },
        { name: "China (Overseas)", lat: 37.5, lng: 122.0, expected: false }
    ];

    let passed = 0;
    for (const t of tests) {
        const isPass = await testPoint(t.name, t.lat, t.lng, t.expected);
        if (isPass) passed++;
    }

    console.log(`\nTest Summary: ${passed} / ${tests.length} Passed`);

    if (passed === tests.length) {
        console.log("✅ All verification tests passed successfully!");
    } else {
        console.log("⚠️ Some tests failed. Check resolution of polygon or logic.");
    }
}

runTests();
