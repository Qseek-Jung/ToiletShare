
export const ABUSE_LIMITS = {
    DAILY_REVIEW_LIMIT: 5,
    DAILY_REPORT_LIMIT: 3,
    MIN_CONTENT_LENGTH: 10,
    MIN_WRITE_TIME_MS: 10000, // 10 seconds
    REVIEW_COOLDOWN_MS: 120000, // 2 minutes
};

const SPAM_PATTERNS = [
    /(.)\1{4,}/,          // Sane character repeated 5+ times (e.g. "aaaaa")
    /(\d{2,})\1{2,}/,     // Numbers repeated (e.g. "121212")
    /([ㄱ-ㅎㅏ-ㅣ])\1{4,}/, // Korean consonants/vowels repeated (e.g. "ㅋㅋㅋㅋㅋ", "ㅎㅎㅎㅎㅎ")
    /^[ㄱ-ㅎㅏ-ㅣ\s]+$/,     // Pure Jamo strings (e.g. "ㅁㄴㅇㄹ", "ㅋㅋㅋㅋㅋㅋㅋㅋ", "ㅎㅇㅎㅇ") - Requires at least one complete syllable or other char
    /^[0-9\s]+$/,         // Pure numeric strings (e.g. "12341234")
    /([a-z])\1{4,}/,      // English char repeated
];

const BAD_WORDS = [
    '시발', '씨발', '병신', '개새끼', '지랄', '존나', '좆', '씹', '창녀', '미친', '엠창', '애미', '애비', '느금마', '느개비', // 욕설
    '섹스', '자위', '보지', '자지', '강간', '콘돔', // 성적 표현
    '살인', '자살', '칼빵' // 폭력
];

// Special check for keyboard mashing sets?
// "asdfasdf" is hard to catch with regex alone without dictionary.
// For now, rely on repetition and length.

export const validateContent = (text: string): { valid: boolean; message?: string } => {
    const cleanText = text.replace(/\s/g, ''); // Remove spaces
    if (cleanText.length < ABUSE_LIMITS.MIN_CONTENT_LENGTH) {
        return { valid: false, message: `조금만 더 자세히 적어주시면 큰 도움이 돼요! (${ABUSE_LIMITS.MIN_CONTENT_LENGTH}자 이상)` };
    }

    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(text)) {
            return { valid: false, message: "의미 있는 내용으로 작성해주시면 더 많은 분들께 도움이 됩니다." };
        }
    }

    // Heuristic: "ㅋㅋㅋ" only check
    const koreanLaugh = (text.match(/[ㅋㅎ]/g) || []).length;
    if (koreanLaugh > text.length * 0.5 && text.length > 20) {
        return { valid: false, message: "너무 반복되는 표현은 피해주세요. 내용이 조금만 더 있으면 좋겠습니다 :)" };
    }

    // Meaningful Content Density Check (Must contain actual text, not just numbers/symbols)
    // "Meaningful" = Hangul Syllables or English Letters. Excludes numbers to prevent "1234567890" spam.
    const linguisticChars = (text.match(/[가-힣a-zA-Z]/g) || []).length;
    if (text.length >= 10 && linguisticChars / text.length < 0.4) {
        return { valid: false, message: "의미 있는 내용으로 작성해주시면 더 많은 분들께 도움이 됩니다." };
    }

    for (const word of BAD_WORDS) {
        if (text.includes(word)) {
            return { valid: false, message: "이곳은 서로 돕는 공간이에요. 모두가 편하게 볼 수 있도록 표현을 조금만 바꿔주세요." };
        }
    }

    return { valid: true };
};
