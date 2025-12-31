// 브라우저 콘솔에서 실행할 중복 데이터 정리 스크립트
// toiletshare.pages.dev 에서 F12 → Console에 붙여넣기

async function removeDaeguDuplicates() {
    try {
        console.log('🔍 대구광역시 중복 데이터 검색 중...');

        // 현재 앱의 DB 인스턴스 사용
        const toilets = await window.db.getToilets();
        const daeguToilets = toilets.filter(t => t.address.includes('대구광역시'));

        console.log(`📊 총 ${daeguToilets.length}개 대구 화장실 발견`);

        // 주소 기준으로 그룹화
        const addressMap = new Map();

        daeguToilets.forEach(toilet => {
            const key = toilet.address;
            if (!addressMap.has(key)) {
                addressMap.set(key, []);
            }
            addressMap.get(key).push(toilet);
        });

        // 중복된 항목 찾기
        let duplicateCount = 0;
        const deletePromises = [];

        addressMap.forEach((group, address) => {
            if (group.length > 1) {
                console.log(`\n🔄 중복 발견: ${address}`);
                console.log(`   총 ${group.length}개 중복`);

                // 생성일 기준 정렬 (오래된 것 우선)
                group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                // 첫 번째 것만 남기고 나머지 삭제
                const [keep, ...duplicates] = group;
                console.log(`   ✅ 보존: ${keep.id} (${keep.createdAt})`);

                duplicates.forEach(dup => {
                    console.log(`   ❌ 삭제 예정: ${dup.id} (${dup.createdAt})`);
                    deletePromises.push(window.db.deleteToilet(dup.id));
                    duplicateCount++;
                });
            }
        });

        console.log(`\n📋 요약:`);
        console.log(`   중복 발견: ${duplicateCount}개`);
        console.log(`   고유 주소: ${addressMap.size}개`);

        if (deletePromises.length > 0) {
            console.log(`\n🗑️  ${deletePromises.length}개 항목 삭제 중...`);
            await Promise.all(deletePromises);
            console.log(`✅ 삭제 완료!`);
            console.log(`\n페이지를 새로고침하세요.`);
        } else {
            console.log(`\n✨ 중복 없음!`);
        }

    } catch (error) {
        console.error('❌ 에러:', error);
    }
}

// 실행
removeDaeguDuplicates();
