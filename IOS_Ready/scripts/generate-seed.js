import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants Copied & Adapted ---
const Gender = { MALE: 'male', FEMALE: 'female', UNISEX: 'unisex' };

const generateToilets = (centerLat, centerLng, count, addressPrefix = "서울 송파구 삼전동") => {
    const toilets = [];
    const userPlaces = ['스타벅스', '투썸플레이스', '올리브영', '다이소', '롯데리아', '맥도날드', '김밥천국', '파리바게뜨', 'PC방', '당구장'];
    const publicPlaces = ['근린공원', '주민센터', '도서관', '체육관', '복지관'];
    const gasPlaces = ['SK주유소', 'GS칼텍스', 'S-OIL', '현대오일뱅크'];

    for (let i = 0; i < count; i++) {
        const r = 0.008 * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const latOffset = r * Math.cos(theta);
        const lngOffset = r * Math.sin(theta) * 1.4;

        const rand = Math.random();
        let type;
        let name;
        let createdBy = undefined;

        if (rand < 0.5) {
            type = 'user_registered';
            name = `${userPlaces[Math.floor(Math.random() * userPlaces.length)]} 화장실`;
            createdBy = 'user_' + Math.floor(Math.random() * 9999);
        } else if (rand < 0.65) {
            if (Math.random() > 0.5) {
                type = 'public';
                name = `${publicPlaces[Math.floor(Math.random() * publicPlaces.length)]} 화장실`;
            } else {
                type = 'park';
                name = `공원 화장실 ${i + 1}호`;
            }
            createdBy = 'admin';
        } else if (rand < 0.8) {
            type = 'gas_station';
            name = `${gasPlaces[Math.floor(Math.random() * gasPlaces.length)]} 주유소`;
            createdBy = 'admin';
        } else {
            type = 'commercial';
            name = `상가건물 ${i + 1}호`;
            createdBy = 'admin';
        }

        const hasPassword = Math.random() > 0.3;

        toilets.push({
            id: `t_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            title: name,
            address: `${addressPrefix} ${Math.floor(Math.random() * 150) + 1}번지`,
            lat: centerLat + latOffset,
            lng: centerLng + lngOffset,
            type: type,
            gender_type: Math.random() > 0.7 ? (Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE) : Gender.UNISEX,
            password: hasPassword ? String(Math.floor(Math.random() * 8999) + 1000) : '',
            created_by: createdBy || 'admin',
            created_at: new Date().toISOString()
        });
    }

    // 삼전역 (고정)
    if (addressPrefix.includes("삼전동")) {
        toilets[0] = {
            ...toilets[0],
            id: 't_station_001',
            title: '삼전역 공영 화장실',
            address: '삼전역 지하 1층',
            lat: centerLat + 0.0002,
            lng: centerLng + 0.0002,
            type: 'station',
            gender_type: Gender.UNISEX,
            password: '',
            created_by: 'admin',
            created_at: new Date().toISOString()
        };
    }

    return toilets;
};

// --- Execution ---
console.log('🚽 화장실 데이터 생성 중...');
const toilets = generateToilets(37.5048, 127.0884, 500); // 500개 생성

console.log(`📝 SQL 파일 생성 중... (${toilets.length}개)`);

let sql = ``;
sql += `DELETE FROM toilets;\n`; // 기존 데이터 삭제

toilets.forEach(t => {
    // Escape single quotes for SQL
    const title = t.title.replace(/'/g, "''");
    const address = t.address.replace(/'/g, "''");

    sql += `INSERT INTO toilets (id, title, address, lat, lng, type, gender_type, password, created_by, created_at) VALUES ('${t.id}', '${title}', '${address}', ${t.lat}, ${t.lng}, '${t.type}', '${t.gender_type}', '${t.password}', '${t.created_by}', '${t.created_at}');\n`;
});



fs.writeFileSync(path.join(__dirname, '../seed.sql'), sql);

console.log('✅ seed.sql 생성 완료!');
