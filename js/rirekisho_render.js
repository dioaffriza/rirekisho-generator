/**
 * Rirekisho (履歴書) A4 Sheet HTML/DOM Renderer.
 * Builds the exact JIS-standard A4 sheet structure in pure HTML/CSS.
 */

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderRirekishoSheet(data) {
    const isBilingual = data.pdf_style !== "japanese";

    // Date line
    const today = new Date();
    const todayEra = westernToEra(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const eraStr = `${todayEra.name}${todayEra.year === 1 ? '元' : todayEra.year}年${today.getMonth() + 1}月${today.getDate()}日現在`;
    const dateLine = isBilingual
        ? `${eraStr} <span class="en-sub">/ As of ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>`
        : eraStr;

    // Birth date calculation
    let birthDisplay = "";
    if (data.birth_date) {
        const parts = data.birth_date.split("-").map(Number);
        if (parts.length === 3) {
            const [bY, bM, bD] = parts;
            const bEra = westernToEra(bY, bM, bD);
            const eraYearLabel = bEra.year === 1 ? "元" : bEra.year;
            const age = calculateAge(data.birth_date);
            if (isBilingual) {
                birthDisplay = `${bEra.name}${eraYearLabel}年${bM}月${bD}日生（満 ${age} 歳 <span class="en-sub">/ Age: ${age}</span>）`;
            } else {
                birthDisplay = `${bEra.name}${eraYearLabel}年${bM}月${bD}日生（満 ${age} 歳）`;
            }
        }
    }

    // Gender display
    let genderDisplay = "";
    if (data.gender) {
        if (isBilingual) {
            genderDisplay = data.gender === "男" ? "男 <span class='en-sub'>(Male)</span>" : (data.gender === "女" ? "女 <span class='en-sub'>(Female)</span>" : escapeHtml(data.gender));
        } else {
            genderDisplay = escapeHtml(data.gender);
        }
    }

    // Photo
    let photoHtml = "";
    if (data.photo) {
        photoHtml = `<img src="${data.photo}" alt="Photo" class="sheet-photo-img">`;
    } else {
        photoHtml = `
            <div class="sheet-photo-placeholder">
                <span class="jp">写　真</span>
                ${isBilingual ? '<span class="en">Photo (3cm × 4cm)</span>' : ''}
                <span class="sub">縦 4cm × 横 3cm</span>
                <span class="sub">${isBilingual ? '写真貼付 / Affix Photo' : '写真を貼る位置'}</span>
            </div>
        `;
    }

    // Education & Work History entries (total 11 rows)
    const historyRows = [];
    // Category 1: 学歴
    historyRows.push({
        year: "", month: "",
        detail: isBilingual ? "学　歴 <span class='en-sub'>/ Education</span>" : "学　歴",
        isHeader: true
    });

    (data.education || []).forEach(item => {
        if (item.year || item.month || item.detail) {
            const eraYr = item.year ? formatDateJapanese(item.year, 0) : "";
            historyRows.push({
                year: eraYr,
                month: item.month || "",
                detail: escapeHtml(item.detail),
                isHeader: false
            });
        }
    });

    // Category 2: 職歴
    historyRows.push({
        year: "", month: "",
        detail: isBilingual ? "職　歴 <span class='en-sub'>/ Work History</span>" : "職　歴",
        isHeader: true
    });

    (data.work_history || []).forEach(item => {
        if (item.year || item.month || item.detail) {
            const eraYr = item.year ? formatDateJapanese(item.year, 0) : "";
            historyRows.push({
                year: eraYr,
                month: item.month || "",
                detail: escapeHtml(item.detail),
                isHeader: false
            });
        }
    });

    // 以上 row
    historyRows.push({
        year: "", month: "",
        detail: isBilingual ? "以上 <span class='en-sub'>/ End</span>" : "以上",
        isEnd: true
    });

    // Pad to at least 11 rows total
    const TOTAL_HIST_ROWS = 11;
    while (historyRows.length < TOTAL_HIST_ROWS) {
        historyRows.push({ year: "", month: "", detail: "" });
    }

    // Licenses entries (total 4 rows)
    const licenseRows = [];
    (data.licenses || []).forEach(item => {
        if (item.year || item.month || item.detail) {
            const eraYr = item.year ? formatDateJapanese(item.year, 0) : "";
            licenseRows.push({
                year: eraYr,
                month: item.month || "",
                detail: escapeHtml(item.detail)
            });
        }
    });
    const TOTAL_LIC_ROWS = 4;
    while (licenseRows.length < TOTAL_LIC_ROWS) {
        licenseRows.push({ year: "", month: "", detail: "" });
    }

    // Motivation & Hobbies
    const motivationText = escapeHtml(data.motivation || "").replace(/\n/g, "<br>");
    const hobbiesText = escapeHtml(data.hobbies || "").replace(/\n/g, "<br>");

    // Spouse & Obligation
    const spouseText = isBilingual
        ? (data.has_spouse ? "有 <span class='en-sub'>(Yes)</span>" : "無 <span class='en-sub'>(No)</span>")
        : (data.has_spouse ? "有" : "無");
    const obligationText = isBilingual
        ? (data.spouse_support_obligation ? "有 <span class='en-sub'>(Yes)</span>" : "無 <span class='en-sub'>(No)</span>")
        : (data.spouse_support_obligation ? "有" : "無");

    return `
    <div class="a4-sheet ${isBilingual ? 'bilingual-mode' : 'japanese-mode'}" id="printable-rirekisho">
        <!-- Sheet Header -->
        <div class="sheet-top-header">
            <div class="sheet-title-wrap">
                <h1 class="sheet-main-title">履　歴　書</h1>
                ${isBilingual ? '<span class="sheet-sub-title">CURRICULUM VITAE</span>' : ''}
            </div>
            <div class="sheet-date-line">${dateLine}</div>
        </div>

        <!-- Personal Info & Photo Grid -->
        <div class="sheet-profile-table">
            <div class="sheet-profile-left">
                <!-- Furigana -->
                <div class="sheet-row row-furi">
                    <div class="sheet-cell cell-label">
                        <span class="jp">ふりがな</span>
                        ${isBilingual ? '<span class="en">Furigana</span>' : ''}
                    </div>
                    <div class="sheet-cell cell-value">${escapeHtml(data.name_furigana)}</div>
                </div>

                <!-- Name -->
                <div class="sheet-row row-name">
                    <div class="sheet-cell cell-label">
                        <span class="jp">氏　名</span>
                        ${isBilingual ? '<span class="en">Full Name</span>' : ''}
                    </div>
                    <div class="sheet-cell cell-value value-name">${escapeHtml(data.name_kanji)}</div>
                </div>

                <!-- Birth Date & Gender -->
                <div class="sheet-row row-birth">
                    <div class="sheet-cell cell-label">
                        <span class="jp">生年月日</span>
                        ${isBilingual ? '<span class="en">Date of Birth</span>' : ''}
                    </div>
                    <div class="sheet-cell cell-value value-birth">${birthDisplay}</div>
                    <div class="sheet-cell cell-gender">${genderDisplay}</div>
                </div>
            </div>

            <!-- Photo box -->
            <div class="sheet-photo-box">
                ${photoHtml}
            </div>
        </div>

        <!-- Address Table -->
        <div class="sheet-address-table">
            <!-- Furigana -->
            <div class="sheet-row row-furi">
                <div class="sheet-cell cell-label">
                    <span class="jp">ふりがな</span>
                    ${isBilingual ? '<span class="en">/ Furigana</span>' : ''}
                </div>
                <div class="sheet-cell cell-value">${escapeHtml(data.address_furigana)}</div>
            </div>
            <!-- Address -->
            <div class="sheet-row row-addr">
                <div class="sheet-cell cell-label">
                    <span class="jp">現住所</span>
                    ${isBilingual ? '<span class="en">Address</span>' : ''}
                </div>
                <div class="sheet-cell cell-value value-address">
                    ${data.postal_code ? `<div class="addr-postal">〒 ${escapeHtml(data.postal_code)}</div>` : ''}
                    <div class="addr-body">${escapeHtml(data.address)}</div>
                </div>
            </div>
            <!-- Phone & Email -->
            <div class="sheet-row row-contact">
                <div class="sheet-cell cell-label">
                    <span class="jp">電話</span>
                    ${isBilingual ? '<span class="en">/ Tel</span>' : ''}
                </div>
                <div class="sheet-cell cell-value">${escapeHtml(data.phone)}</div>
                <div class="sheet-cell cell-label cell-email-label">E-mail</div>
                <div class="sheet-cell cell-value cell-email-val">${escapeHtml(data.email)}</div>
            </div>
        </div>

        <!-- Alternate Contact Table (連絡先) -->
        <div class="sheet-address-table sheet-alt-contact">
            <!-- Furigana -->
            <div class="sheet-row row-furi">
                <div class="sheet-cell cell-label">
                    <span class="jp">ふりがな</span>
                    ${isBilingual ? '<span class="en">/ Furigana</span>' : ''}
                </div>
                <div class="sheet-cell cell-value">${escapeHtml(data.address_furigana_2)}</div>
            </div>
            <!-- Address 2 -->
            <div class="sheet-row row-addr">
                <div class="sheet-cell cell-label">
                    <span class="jp">連絡先</span>
                    ${isBilingual ? '<span class="en">Contact</span>' : '<span class="sub">(現住所以外)</span>'}
                </div>
                <div class="sheet-cell cell-value value-address">
                    ${data.postal_code_2 ? `<div class="addr-postal">〒 ${escapeHtml(data.postal_code_2)}</div>` : ''}
                    ${data.address_2 ? `<div class="addr-body">${escapeHtml(data.address_2)}</div>` : `<div class="addr-note">（現住所以外に連絡を希望する場合のみ記入 ${isBilingual ? '/ Only if different from address' : ''}）</div>`}
                </div>
            </div>
            <!-- Phone 2 -->
            <div class="sheet-row row-contact">
                <div class="sheet-cell cell-label">
                    <span class="jp">電話</span>
                    ${isBilingual ? '<span class="en">/ Tel</span>' : ''}
                </div>
                <div class="sheet-cell cell-value">${escapeHtml(data.phone_2)}</div>
            </div>
        </div>

        <!-- Education & Work History Table -->
        <div class="sheet-history-table">
            <div class="sheet-history-header">
                <div class="col-yr">
                    <span class="jp">年</span>
                    ${isBilingual ? '<span class="en">Year</span>' : ''}
                </div>
                <div class="col-mo">
                    <span class="jp">月</span>
                    ${isBilingual ? '<span class="en">Month</span>' : ''}
                </div>
                <div class="col-detail">
                    <span class="jp">学　歴　・　職　歴</span>
                    ${isBilingual ? '<span class="en">Academic &amp; Employment History</span>' : ''}
                </div>
            </div>
            ${historyRows.map(row => `
                <div class="sheet-history-row ${row.isHeader ? 'row-category-header' : ''}">
                    <div class="col-yr">${row.year || ''}</div>
                    <div class="col-mo">${row.month || ''}</div>
                    <div class="col-detail ${row.isHeader ? 'text-center' : (row.isEnd ? 'text-right' : '')}">${row.detail || ''}</div>
                </div>
            `).join('')}
        </div>

        <!-- Licenses & Qualifications Table -->
        <div class="sheet-history-table sheet-license-table">
            <div class="sheet-history-header">
                <div class="col-yr">
                    <span class="jp">年</span>
                    ${isBilingual ? '<span class="en">Year</span>' : ''}
                </div>
                <div class="col-mo">
                    <span class="jp">月</span>
                    ${isBilingual ? '<span class="en">Month</span>' : ''}
                </div>
                <div class="col-detail">
                    <span class="jp">免　許　・　資　格</span>
                    ${isBilingual ? '<span class="en">Licenses &amp; Qualifications</span>' : ''}
                </div>
            </div>
            ${licenseRows.map(row => `
                <div class="sheet-history-row">
                    <div class="col-yr">${row.year || ''}</div>
                    <div class="col-mo">${row.month || ''}</div>
                    <div class="col-detail">${row.detail || ''}</div>
                </div>
            `).join('')}
        </div>

        <!-- Bottom Section: Motivation & Miscellaneous -->
        <div class="sheet-bottom-grid">
            <!-- Left Box: Statement of Purpose & Skills -->
            <div class="sheet-bottom-left">
                <div class="bottom-box-label">
                    <span class="jp">志望の動機、特技、アピールポイントなど</span>
                    ${isBilingual ? '<span class="en">/ Statement of Purpose &amp; Special Skills</span>' : ''}
                </div>
                <div class="bottom-box-content">
                    <div class="content-motivation">${motivationText}</div>
                    ${hobbiesText ? `
                        <div class="content-hobbies">
                            <strong>【趣味・特技 ${isBilingual ? '/ Hobbies &amp; Skills' : ''}】</strong><br>
                            ${hobbiesText}
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Right Column Boxes -->
            <div class="sheet-bottom-right">
                <!-- Commute Time -->
                <div class="bottom-right-row row-commute">
                    <div class="sub-label">
                        <span class="jp">通勤時間</span>
                        ${isBilingual ? '<span class="en">/ Commute Time</span>' : ''}
                    </div>
                    <div class="sub-val">${escapeHtml(data.commute_time)}</div>
                </div>

                <!-- Dependents -->
                <div class="bottom-right-row row-dependents">
                    <div class="sub-label">
                        <span class="jp">扶養家族数 (配偶者除く)</span>
                        ${isBilingual ? '<span class="en">/ Dependents</span>' : ''}
                    </div>
                    <div class="sub-val">${data.dependents_count ? `${escapeHtml(data.dependents_count)} 人 ${isBilingual ? '/ Person(s)' : ''}` : '0 人'}</div>
                </div>

                <!-- Spouse & Support -->
                <div class="bottom-right-row row-spouse-split">
                    <div class="half-box">
                        <div class="sub-label">
                            <span class="jp">配偶者</span>
                            ${isBilingual ? '<span class="en">/ Spouse</span>' : ''}
                        </div>
                        <div class="sub-val">${spouseText}</div>
                    </div>
                    <div class="half-box">
                        <div class="sub-label">
                            <span class="jp">扶養義務</span>
                            ${isBilingual ? '<span class="en">/ Support</span>' : ''}
                        </div>
                        <div class="sub-val">${obligationText}</div>
                    </div>
                </div>

                <!-- Personal Requests & Remarks -->
                <div class="bottom-right-row row-requests">
                    <div class="sub-label">
                        <span class="jp">本人希望記入欄</span>
                        ${isBilingual ? '<span class="en">/ Preferences &amp; Requests</span>' : '<span class="sub">(給料・職種・勤務地等の希望)</span>'}
                    </div>
                    <div class="sub-val-req">${escapeHtml(data.requests || "").replace(/\n/g, "<br>")}</div>
                </div>
            </div>
        </div>
    </div>
    `;
}
