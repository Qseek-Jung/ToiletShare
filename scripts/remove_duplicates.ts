// Supabase 중복 데이터 정리 스크립트
// 대구광역시 중복 화장실 데이터 삭제

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbkkjxevbnswclnefbqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBia2tqeGV2Ym5zd2NsbmVmYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MDU5NzksImV4cCI6MjA0ODk4MTk3OX0.VGdCYnwWQvU8lGPnZZTqiC1dSm7N8SaVJZPX-hgp8yg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function removeDuplicates() {
    try {
        console.log('🔍 중복 데이터 검색 중...');

        // 대구광역시 데이터만 가져오기
        const { data: toilets, error } = await supabase
            .from('toilets')
            .select('*')
            .ilike('address', '%대구광역시%')
            .order('createdAt', { ascending: true });

        if (error) throw error;

        console.log(`📊 총 ${toilets?.length}개 대구 화장실 발견`);

        // 주소 기준으로 그룹화
        const addressMap = new Map<string, any[]>();

        toilets?.forEach(toilet => {
            const key = toilet.address;
            if (!addressMap.has(key)) {
                addressMap.set(key, []);
            }
            addressMap.get(key)!.push(toilet);
        });

        // 중복된 항목 찾기
        let duplicateCount = 0;
        const idsToDelete: string[] = [];

        addressMap.forEach((group, address) => {
            if (group.length > 1) {
                console.log(`\n🔄 중복 발견: ${address}`);
                console.log(`   총 ${group.length}개 중복`);

                // 첫 번째 것만 남기고 나머지 삭제 대상으로 추가
                const [keep, ...duplicates] = group;
                console.log(`   ✅ 보존: ID ${keep.id} (생성: ${keep.createdAt})`);

                duplicates.forEach(dup => {
                    console.log(`   ❌ 삭제 예정: ID ${dup.id} (생성: ${dup.createdAt})`);
                    idsToDelete.push(dup.id);
                    duplicateCount++;
                });
            }
        });

        console.log(`\n📋 요약:`);
        console.log(`   중복된 항목: ${duplicateCount}개`);
        console.log(`   고유 주소: ${addressMap.size}개`);

        if (idsToDelete.length > 0) {
            console.log(`\n🗑️  ${idsToDelete.length}개 항목 삭제 중...`);

            const { error: deleteError } = await supabase
                .from('toilets')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) throw deleteError;

            console.log(`✅ 삭제 완료!`);
        } else {
            console.log(`\n✨ 중복 없음!`);
        }

    } catch (error) {
        console.error('❌ 에러:', error);
    }
}

// 실행
removeDuplicates();
