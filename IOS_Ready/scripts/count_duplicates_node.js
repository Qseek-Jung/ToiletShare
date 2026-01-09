// scripts/count_duplicates_node.js
// 이 스크립트는 터미널에서 실행하여 중복 데이터 개수를 확인합니다.
// 실행 방법: node scripts/count_duplicates_node.js

// ⚠️ 아래 두 변수에 Supabase 설정값을 직접 입력해주세요.
// (보안상 코드에 포함되지 않았으나, .env 파일이나 대시보드에서 찾을 수 있습니다)
const SUPABASE_URL = "YOUR_SUPABASE_URL"; // 예: https://xyz.supabase.co
const SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"; // Service Role Key (권장) 또는 Anon Key

const { createClient } = require('@supabase/supabase-js');

async function countDuplicates() {
    if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('YOUR_')) {
        console.error("❌ 오류: 스크립트 상단의 SUPABASE_URL과 SUPABASE_KEY를 설정해주세요.");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("🔍 중복 데이터 검색 중...");

    const { data, error } = await supabase
        .from('toilets')
        .select('address, created_at')
        .not('address', 'is', null)
        .neq('address', '')
        .neq('address', '주소 없음');

    if (error) {
        console.error("데이터 조회 실패:", error);
        return;
    }

    const addressMap = {};
    let duplicateGroupCount = 0;
    let totalDuplicateItems = 0;

    data.forEach(item => {
        const addr = item.address;
        if (!addressMap[addr]) {
            addressMap[addr] = 1;
        } else {
            addressMap[addr]++;
        }
    });

    for (const addr in addressMap) {
        if (addressMap[addr] > 1) {
            duplicateGroupCount++;
            totalDuplicateItems += (addressMap[addr] - 1); // 원본 1개 제외한 중복 개수
        }
    }

    console.log("==========================================");
    console.log(`📊 분석 결과:`);
    console.log(`- 전체 화장실 데이터 수: ${data.length}개`);
    console.log(`- 중복된 주소 그룹 수: ${duplicateGroupCount}개`);
    console.log(`- 🗑️ 삭제될 중복 데이터 수: ${totalDuplicateItems}건 (이 숫자를 환불 요청에 사용하세요)`);
    console.log("==========================================");
}

countDuplicates();
