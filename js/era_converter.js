/**
 * Japanese era (和暦) ↔ Western year (西暦) converter (Pure JavaScript).
 * Supports: 令和 (Reiwa), 平成 (Heisei), 昭和 (Showa), 大正 (Taisho), 明治 (Meiji).
 */

const ERAS = [
    { name: "令和", romaji: "Reiwa", start: new Date(2019, 4, 1), end: null },
    { name: "平成", romaji: "Heisei", start: new Date(1989, 0, 8), end: new Date(2019, 3, 30) },
    { name: "昭和", romaji: "Showa", start: new Date(1926, 11, 25), end: new Date(1989, 0, 7) },
    { name: "大正", romaji: "Taisho", start: new Date(1912, 6, 30), end: new Date(1926, 11, 24) },
    { name: "明治", romaji: "Meiji", start: new Date(1868, 0, 25), end: new Date(1912, 6, 29) },
];

/**
 * Convert Western date to Japanese era.
 * @param {number} year - Western year (e.g. 1995)
 * @param {number} month - Month (1-12)
 * @param {number} day - Day (1-31)
 * @returns {{ name: string, year: number }}
 */
function westernToEra(year, month = 1, day = 1) {
    const target = new Date(year, month - 1, day);

    for (const era of ERAS) {
        if (target >= era.start) {
            const eraYear = year - era.start.getFullYear() + 1;
            return { name: era.name, year: eraYear };
        }
    }
    return { name: "", year };
}

/**
 * Format a year and month as a Japanese era string (e.g. "令和6年5月" or "平成2年1月").
 * Year 1 uses "元".
 * @param {number|string} year - Western year
 * @param {number|string} month - Month (1-12)
 * @returns {string}
 */
function formatDateJapanese(year, month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) || 1;
    if (isNaN(y)) return "";

    try {
        const { name, year: eraYear } = westernToEra(y, m);
        if (!name) return `${y}年${m ? m + '月' : ''}`;
        const yearStr = eraYear === 1 ? "元" : String(eraYear);
        return month ? `${name}${yearStr}年${m}月` : `${name}${yearStr}年`;
    } catch {
        return month ? `${y}年${m}月` : `${y}年`;
    }
}

/**
 * Calculate age from an ISO birth date string ("YYYY-MM-DD").
 * @param {string} birthDateStr
 * @param {Date} [referenceDate]
 * @returns {number|null}
 */
function calculateAge(birthDateStr, referenceDate = new Date()) {
    if (!birthDateStr) return null;
    const parts = birthDateStr.split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return null;

    const [bYear, bMonth, bDay] = parts;
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1;
    const refDay = referenceDate.getDate();

    let age = refYear - bYear;
    if (refMonth < bMonth || (refMonth === bMonth && refDay < bDay)) {
        age -= 1;
    }
    return age >= 0 ? age : 0;
}

/**
 * Get era metadata choices.
 */
function getEraChoices() {
    return ERAS.map(e => ({
        name: e.name,
        romaji: e.romaji,
        start_year: e.start.getFullYear(),
        end_year: e.end ? e.end.getFullYear() : null,
    }));
}
