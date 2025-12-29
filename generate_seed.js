import fs from 'fs';

const SONGPA_LAT_MIN = 37.4800;
const SONGPA_LAT_MAX = 37.5300;
const SONGPA_LNG_MIN = 127.0600;
const SONGPA_LNG_MAX = 127.1500;

function randomCoord() {
    const lat = Math.random() * (SONGPA_LAT_MAX - SONGPA_LAT_MIN) + SONGPA_LAT_MIN;
    const lng = Math.random() * (SONGPA_LNG_MAX - SONGPA_LNG_MIN) + SONGPA_LNG_MIN;
    return { lat, lng };
}

function randomBool() { return Math.random() > 0.5; }
function randomPin() { return Math.floor(1000 + Math.random() * 9000).toString(); }

let sql = "DELETE FROM toilets;\n";

let idCounter = 1;
const toilets = [];

function addToilet(createdBy, gender, hasPassword, type = 'public') {
    const { lat, lng } = randomCoord();
    // ID 생성
    const id = `t_gen_${Date.now()}_${idCounter++}`;
    const pwd = hasPassword ? randomPin() : '';
    const hasPaper = randomBool();
    const hasBidet = randomBool();

    // Address (Dummy)
    const roadNum = Math.floor(Math.random() * 200) + 1;
    const address = `서울 송파구 올림픽로 ${roadNum}길 ${Math.floor(Math.random() * 50) + 1}`;

    // Title
    let roleStr = createdBy === 'admin' ? '관리자' : '사용자';
    let pwdStr = hasPassword ? '(Lock)' : '(Open)';
    const title = `[TEST] ${gender} 화장실 ${idCounter - 1}`; // Simple title

    // Type decision
    let realType = type;
    if (createdBy === 'admin') {
        const types = ['public', 'park', 'station', 'commercial', 'gas_station'];
        realType = types[Math.floor(Math.random() * types.length)];
    } else {
        realType = 'user_registered';
    }

    // Gender: MALE, FEMALE, UNISEX (Upper case to match Types.ts)
    // created_at
    const createdAt = new Date().toISOString();

    sql += `INSERT INTO toilets (id, title, address, lat, lng, type, gender_type, password, created_by, created_at, has_paper, has_bidet) VALUES ('${id}', '${title}', '${address}', ${lat}, ${lng}, '${realType}', '${gender}', '${pwd}', '${createdBy}', '${createdAt}', ${hasPaper ? 1 : 0}, ${hasBidet ? 1 : 0});\n`;
}

// 1. 관리자 등록 화장실 (110개)
// 남성 30, 여성 30, 공용 50
for (let i = 0; i < 30; i++) addToilet('admin', 'MALE', false);
for (let i = 0; i < 30; i++) addToilet('admin', 'FEMALE', false);
for (let i = 0; i < 50; i++) addToilet('admin', 'UNISEX', false);

// 2. 사용자 등록 화장실
// User IDs
const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5', 'lee@test.com', 'yoo@test.com'];
function randomUser() { return userIds[Math.floor(Math.random() * userIds.length)]; }

// 남성(비번X) 30
for (let i = 0; i < 30; i++) addToilet(randomUser(), 'MALE', false);
// 여성(비번X) 30
for (let i = 0; i < 30; i++) addToilet(randomUser(), 'FEMALE', false);
// 공용(비번X) 30
for (let i = 0; i < 30; i++) addToilet(randomUser(), 'UNISEX', false);

// 남성(비번O) 30
for (let i = 0; i < 30; i++) addToilet(randomUser(), 'MALE', true);
// 여성(비번O) 30 (Assume 30)
for (let i = 0; i < 30; i++) addToilet(randomUser(), 'FEMALE', true);
// 공용(비번O) 30 (Assume 30)
for (let i = 0; i < 30; i++) addToilet(randomUser(), 'UNISEX', true);

fs.writeFileSync('new_seed.sql', sql);
console.log('Seed Generated: new_seed.sql');
