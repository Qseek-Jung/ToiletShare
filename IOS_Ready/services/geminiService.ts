
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// Note: You should move this API key to .env in production
const API_KEY = ""; // User needs to provide this or use env. For now, we reuse existing if found or ask user.
// Wait, I don't have the key. I should check config or .env.local
// I will check specific instructions later. For now, I'll setup the structure.

// We will assume the API KEY is available via import.meta.env.VITE_GEMINI_API_KEY
// or similar. Let's check environment variables in next steps.

export const checkAmbiguousAddress = async (
    name: string,
    address: string,
    region: string
): Promise<{
    correctedAddress: string | null;
    searchQuery?: string | null;
    confidence: number;
    reason: string;
} | null> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("Gemini API Key missing");
            return { correctedAddress: null, confidence: 0, reason: "API Key Missing" };
        }
        console.log("Using API Key starting with:", apiKey.substring(0, 5)); // Debug Log

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use gemini-2.0-flash-exp (gemini-1.5-flash retired in 2025)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });


        const prompt = `
        You are a smart address search optimizer for Kakao Maps.
        Context: User wants to find the exact coordinates for a facility named "${name}" located roughly at "${address}" in "${region}".

        Problem:
        1. Simply searching the address "${address}" might result in a generic City Hall/District Office location if the address is too short (e.g. just "Daejeon Seo-gu").
        2. Searching just the name might fail if there are duplicates.
        3. Combining "Name + Address" is usually best, but sometimes the address is wrong.

        Task:
        1. Analyze the Input Name: "${name}" and Input Address: "${address}".
        2. Determine the BEST search query string to send to Kakao Maps API to find the SPECIFIC building/park/toilet.
        3. If the input address is very vague (e.g. only contains city/gu like "대전 서구"), IGNORE the address and create a query using "Name + Region" (e.g. "우장산공원 대전").
        4. If the input address seems specific (has road name/number), combine them for higher precision (e.g. "영진로얄상가 대전 대덕구 아리랑로 211").
        5. If you are 90% sure the facility is NOT in ${region} (e.g. Woojangsan Park is famous in Seoul, not Daejeon), return correctedAddress as null to flag it as error.

        Output JSON format:
        {
            "correctedAddress": "The standard address string (for display purpose)", 
            "searchQuery": "The OPTIMIZED string to query Kakao Maps API",
            "confidence": 0.0 to 1.0,
            "reason": "Why did you choose this query?"
        }

        Example 1:
        Input: Name="Woojangsan Park", Address="Daejeon Seo-gu"
        Output: { "correctedAddress": null, "searchQuery": null, "confidence": 0.1, "reason": "Woojangsan Park is in Seoul, not Daejeon." }

        Example 2:
        Input: Name="Youngjin Royal Plaza", Address="Arirang-ro 211"
        Output: { "correctedAddress": "Daejeon Daedeok-gu Arirang-ro 211", "searchQuery": "영진로얄상가 대전 대덕구 아리랑로 211", "confidence": 0.95, "reason": "Combined building name with address for exact pin." }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as { correctedAddress: string | null; searchQuery?: string; confidence: number; reason: string };
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
};

export async function judgeCoordinates(
    name: string,
    region: string,
    inputLat: number,
    inputLng: number,
    searchLat: number,
    searchLng: number
) {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("Gemini API Key missing for judgeCoordinates");
            return { selected: "search", reason: "API Key Missing" };
        }
        console.log("Using API Key starting with:", apiKey.substring(0, 5));

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const prompt = `
        You are a location verification expert.
        
        Situation:
        User provided a facility location (Input Coords).
        We searched using the address/name and found a location (Search Coords).
        There is a discrepancy.

        Facility: "${name}"
        Region: "${region}"
        Input Coords: ${inputLat}, ${inputLng}
        Search Coords: ${searchLat}, ${searchLng}

        Task:
        Determine which coordinate is arguably better or if we should trust the input.
        If the Input Coords seem plausible for the facility (e.g. inside a park, specific building block), TRUST INPUT.
        If the Input Coords seem like garbage (0,0 or middle of ocean or totally wrong city), TRUST SEARCH.
        
        Output JSON:
        {
            "selected": "input" | "search",
            "reason": "Brief explanation"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { selected: "search", reason: "Fallback on error" };

    } catch (e) {
        console.error("Gemini API Error in judgeCoordinates:", e);
        return { selected: "search", reason: "AI Error" };
    }
}