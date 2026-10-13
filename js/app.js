/**
 * 履歴書メーカー (Rirekisho Maker) — Pure Client-Side JavaScript Application Logic.
 * Zero backend required. 100% runs inside the browser.
 */

// Global state
let currentPhotoBase64 = "";
let currentScale = 0.72;
const STORAGE_KEY = "rirekisho_maker_draft_v1";
const THEME_KEY = "rirekisho_maker_theme";

const SAMPLE_DATA = {
    pdf_style: "bilingual",
    name_kanji: "山田 太郎 / Taro Yamada",
    name_furigana: "やまだ たろう",
    birth_date: "1995-10-15",
    gender: "男",
    photo: "",
    postal_code: "100-0001",
    address_furigana: "とうきょうと ちよだく ちよだ",
    address: "東京都千代田区千代田1-1 (1-1 Chiyoda, Chiyoda-ku, Tokyo)",
    phone: "090-1234-5678",
    email: "taro.yamada@example.com",
    postal_code_2: "",
    address_furigana_2: "",
    address_2: "",
    phone_2: "",
    education: [
        { year: "2011", month: "4", detail: "東京都立○○高等学校 入学 / Enrolled in Tokyo High School" },
        { year: "2014", month: "3", detail: "東京都立○○高等学校 卒業 / Graduated from Tokyo High School" },
        { year: "2014", month: "4", detail: "○○大学 経済学部 入学 / Enrolled in Univ. Faculty of Economics" },
        { year: "2018", month: "3", detail: "○○大学 経済学部 卒業 / Graduated from Univ. Faculty of Economics" }
    ],
    work_history: [
        {
            year: "2018",
            month: "4",
            detail: "株式会社スタッフサービス 登録（派遣元） / Staff Service (Agency)",
            sub_items: [
                { year: "2018", month: "5", detail: "株式会社メルカリ（派遣先）に派遣 / Dispatched to Mercari, Inc." },
                { year: "2020", month: "3", detail: "派遣期間満了につき終了 / Completed dispatch contract" }
            ]
        },
        {
            year: "2020",
            month: "4",
            detail: "株式会社サンプル商事 入社 / Sample Corp. (Backend Engineer)",
            sub_items: []
        },
        {
            year: "2023",
            month: "3",
            detail: "一身上の都合により退職 / Resigned for personal reasons",
            sub_items: []
        }
    ],
    licenses: [
        { year: "2016", month: "8", detail: "普通自動車第一種運転免許 / Driver's License (Class 1)" },
        { year: "2019", month: "11", detail: "TOEIC Listening & Reading Test 800点 取得" }
    ],
    motivation: "貴社の先進的なクラウド技術開発に深く共感し、志望いたしました。Webバックエンドの開発・運用を5年間担当し、システムの可用性向上に貢献いたしました。\nI am strongly drawn to your cutting-edge cloud engineering and look forward to contributing my 5 years of backend engineering experience.",
    hobbies: "プログラミング、登山、写真撮影 / Programming, Hiking, Photography",
    commute_time: "約45分 / ~45 min",
    dependents_count: "0",
    has_spouse: false,
    spouse_support_obligation: false,
    requests: "勤務地：東京本社希望 / Location: Tokyo HQ preferred"
};

// ============================================================
// Initialization
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // Toolbar buttons
    document.getElementById("btn-theme-toggle")?.addEventListener("click", toggleTheme);
    document.getElementById("btn-generate")?.addEventListener("click", exportPDF);
    document.getElementById("btn-print")?.addEventListener("click", () => window.print());
    document.getElementById("btn-sample")?.addEventListener("click", loadSampleData);
    document.getElementById("btn-clear")?.addEventListener("click", clearFormData);
    document.getElementById("btn-save")?.addEventListener("click", saveJSON);
    document.getElementById("btn-load")?.addEventListener("click", () => {
        document.getElementById("json-file-input")?.click();
    });
    document.getElementById("json-file-input")?.addEventListener("change", loadJSON);
    document.getElementById("btn-remove-photo")?.addEventListener("click", removePhoto);

    // Initialize Theme
    initTheme();

    // Zoom buttons
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => setZoom(currentScale + 0.08));
    document.getElementById("btn-zoom-out")?.addEventListener("click", () => setZoom(currentScale - 0.08));
    document.getElementById("btn-zoom-fit")?.addEventListener("click", autoFitScale);

    // Photo input
    document.getElementById("photo")?.addEventListener("change", handlePhotoUpload);

    // Reactive input listeners across all form fields
    const formInputs = document.querySelectorAll(".form-column input, .form-column textarea, .form-column select, #pdf_style");
    formInputs.forEach(input => {
        input.addEventListener("input", onFormChange);
        input.addEventListener("change", onFormChange);
    });

    // Dynamic row buttons (add)
    document.querySelectorAll(".btn-add-row").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            addDynamicRow(targetId);
            onFormChange();
        });
    });

    // Dynamic row buttons (remove & work history sub-items)
    document.querySelectorAll(".dynamic-list").forEach(list => {
        list.addEventListener("click", (e) => {
            // Remove main dynamic row
            if (e.target.classList.contains("btn-remove")) {
                removeDynamicRow(e.target);
                onFormChange();
                return;
            }

            // Work history specific buttons
            const group = e.target.closest(".work-item-group");
            if (!group) return;

            // Toggle / add sub-item
            if (e.target.closest(".btn-add-subitem")) {
                const subContainer = group.querySelector(".subitems-container");
                const subList = group.querySelector(".subitems-list");
                if (subContainer && subList) {
                    if (subList.children.length === 0) {
                        addSubItemRow(group, "", "", "株式会社○○（派遣先）に派遣 / Dispatched to ○○ Corp.");
                    } else {
                        addSubItemRow(group, "", "", "");
                    }
                    onFormChange();
                }
                return;
            }

            // Add sub-item row button inside container
            if (e.target.closest(".btn-add-subitem-row")) {
                addSubItemRow(group, "", "", "");
                onFormChange();
                return;
            }

            // Quick tag buttons
            if (e.target.classList.contains("btn-quick-tag")) {
                const tagType = e.target.getAttribute("data-tag");
                if (tagType === "派遣先") {
                    addSubItemRow(group, "", "", "株式会社○○（派遣先）に派遣 / Dispatched to ○○ Corp.");
                } else if (tagType === "満了") {
                    addSubItemRow(group, "", "", "派遣期間満了につき終了 / Completed dispatch contract");
                }
                onFormChange();
                return;
            }

            // Remove sub-item row
            if (e.target.closest(".btn-remove-sub")) {
                const subRow = e.target.closest(".subitem-row");
                const subList = group.querySelector(".subitems-list");
                const subContainer = group.querySelector(".subitems-container");
                const subBtn = group.querySelector(".btn-add-subitem");
                if (subRow) subRow.remove();
                if (subList && subList.children.length === 0) {
                    if (subContainer) subContainer.style.display = "none";
                    if (subBtn) subBtn.classList.remove("active");
                }
                onFormChange();
                return;
            }
        });
    });

    // Restore draft from localStorage or populate sample
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            populateForm(JSON.parse(saved));
        } catch {
            populateForm(SAMPLE_DATA);
        }
    } else {
        populateForm(SAMPLE_DATA);
    }

    // Auto-fit scale on load & resize
    autoFitScale();
    window.addEventListener("resize", debounce(autoFitScale, 200));
});

// ============================================================
// Form Data Collection & Real-Time Sync
// ============================================================

function collectFormData() {
    return {
        pdf_style: document.getElementById("pdf_style")?.value || "bilingual",
        name_kanji: val("name_kanji"),
        name_furigana: val("name_furigana"),
        birth_date: val("birth_date"),
        gender: document.querySelector('input[name="gender"]:checked')?.value || "男",
        photo: currentPhotoBase64,
        postal_code: val("postal_code"),
        address_furigana: val("address_furigana"),
        address: val("address"),
        phone: val("phone"),
        email: val("email"),
        postal_code_2: val("postal_code_2"),
        address_furigana_2: val("address_furigana_2"),
        address_2: val("address_2"),
        phone_2: val("phone_2"),
        education: collectDynamicList("education-list"),
        work_history: collectDynamicList("work-history-list"),
        licenses: collectDynamicList("licenses-list"),
        motivation: val("motivation"),
        hobbies: val("hobbies"),
        commute_time: val("commute_time"),
        dependents_count: val("dependents_count") || "0",
        has_spouse: !!document.getElementById("has_spouse")?.checked,
        spouse_support_obligation: !!document.getElementById("spouse_support_obligation")?.checked,
        requests: val("requests"),
    };
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function collectDynamicList(listId) {
    const container = document.getElementById(listId);
    if (!container) return [];

    if (listId === "work-history-list") {
        const groups = container.querySelectorAll(".work-item-group");
        const items = [];
        groups.forEach(group => {
            const mainRow = group.querySelector(".main-row") || group.querySelector(".dynamic-row");
            const yr = mainRow?.querySelector(".input-year")?.value.trim() || "";
            const mo = mainRow?.querySelector(".input-month")?.value || "";
            const det = mainRow?.querySelector(".input-detail")?.value.trim() || "";

            const subItems = [];
            group.querySelectorAll(".subitem-row").forEach(subRow => {
                const sYr = subRow.querySelector(".input-year-sub")?.value.trim() || "";
                const sMo = subRow.querySelector(".input-month-sub")?.value || "";
                const sDet = subRow.querySelector(".input-detail-sub")?.value.trim() || "";
                if (sYr || sMo || sDet) {
                    subItems.push({ year: sYr, month: sMo, detail: sDet });
                }
            });

            if (yr || mo || det || subItems.length > 0) {
                items.push({
                    year: yr,
                    month: mo,
                    detail: det,
                    sub_items: subItems
                });
            }
        });
        return items;
    }

    const rows = container.querySelectorAll(".dynamic-row");
    const items = [];
    rows.forEach(row => {
        items.push({
            year: row.querySelector(".input-year")?.value.trim() || "",
            month: row.querySelector(".input-month")?.value || "",
            detail: row.querySelector(".input-detail")?.value.trim() || "",
        });
    });
    return items;
}

/**
 * Triggered on every form edit.
 * Re-renders the sheet immediately and saves draft to localStorage.
 */
function onFormChange() {
    const data = collectFormData();
    updateSheetPreview(data);
    updateBirthDateDisplay(data.birth_date);

    // Save draft
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // quota exceeded or private mode
    }
}

/**
 * Re-renders the A4 sheet inside the preview container.
 */
function updateSheetPreview(data) {
    const container = document.getElementById("sheet-render-mount");
    if (!container) return;
    container.innerHTML = renderRirekishoSheet(data);
}

function updateBirthDateDisplay(birthDateStr) {
    const calcEl = document.getElementById("birth_date_calc");
    if (!calcEl) return;
    if (!birthDateStr) {
        calcEl.textContent = "";
        return;
    }
    const eraStr = formatDateJapanese(birthDateStr.split("-")[0], birthDateStr.split("-")[1]);
    const age = calculateAge(birthDateStr);
    calcEl.textContent = `${eraStr}${birthDateStr.split("-")[2]}日生（満 ${age} 歳 / Age: ${age}）`;
}

// ============================================================
// Form Population
// ============================================================

function populateForm(data) {
    if (!data) return;

    if (data.pdf_style) {
        const styleSel = document.getElementById("pdf_style");
        if (styleSel) styleSel.value = data.pdf_style;
    }

    const simpleFields = [
        "name_kanji", "name_furigana", "birth_date",
        "postal_code", "address_furigana", "address", "phone", "email",
        "postal_code_2", "address_furigana_2", "address_2", "phone_2",
        "motivation", "hobbies", "commute_time", "dependents_count", "requests",
    ];

    simpleFields.forEach(field => {
        const el = document.getElementById(field);
        if (el && data[field] !== undefined) {
            el.value = data[field];
        }
    });

    if (data.gender) {
        const rad = document.querySelector(`input[name="gender"][value="${data.gender}"]`);
        if (rad) rad.checked = true;
    }

    if (data.has_spouse !== undefined) {
        const sp = document.getElementById("has_spouse");
        if (sp) sp.checked = !!data.has_spouse;
    }
    if (data.spouse_support_obligation !== undefined) {
        const ob = document.getElementById("spouse_support_obligation");
        if (ob) ob.checked = !!data.spouse_support_obligation;
    }

    // Photo
    if (data.photo) {
        currentPhotoBase64 = data.photo;
        const previewEl = document.getElementById("photo-preview");
        if (previewEl) {
            previewEl.innerHTML = `<img src="${currentPhotoBase64}" alt="Photo">`;
            previewEl.classList.add("has-photo");
        }
        const removeBtn = document.getElementById("btn-remove-photo");
        if (removeBtn) removeBtn.style.display = "inline-block";
    } else {
        removePhoto();
    }

    populateDynamicList("education-list", data.education);
    populateDynamicList("work-history-list", data.work_history);
    populateDynamicList("licenses-list", data.licenses);

    updateBirthDateDisplay(data.birth_date);
    updateSheetPreview(data);
}

function populateDynamicList(listId, items) {
    const container = document.getElementById(listId);
    if (!container) return;

    if (listId === "work-history-list") {
        container.querySelectorAll(".work-item-group, .dynamic-row").forEach(r => r.remove());
        const entries = (items && items.length > 0) ? items : [{ year: "", month: "", detail: "", sub_items: [] }];
        entries.forEach(item => {
            const group = addWorkHistoryGroup();
            const mainRow = group.querySelector(".main-row");
            if (item.year) mainRow.querySelector(".input-year").value = item.year;
            if (item.month) mainRow.querySelector(".input-month").value = item.month;
            if (item.detail) mainRow.querySelector(".input-detail").value = item.detail;

            if (item.sub_items && Array.isArray(item.sub_items) && item.sub_items.length > 0) {
                item.sub_items.forEach(sub => {
                    addSubItemRow(group, sub.year, sub.month, sub.detail);
                });
            }
        });
        return;
    }

    container.querySelectorAll(".dynamic-row").forEach(r => r.remove());
    const entries = (items && items.length > 0) ? items : [{ year: "", month: "", detail: "" }];
    entries.forEach(item => {
        addDynamicRow(listId);
        const rows = container.querySelectorAll(".dynamic-row");
        const lastRow = rows[rows.length - 1];
        if (item.year) lastRow.querySelector(".input-year").value = item.year;
        if (item.month) lastRow.querySelector(".input-month").value = item.month;
        if (item.detail) lastRow.querySelector(".input-detail").value = item.detail;
    });
}

// ============================================================
// Dynamic Row Management
// ============================================================

function addDynamicRow(listId) {
    if (listId === "work-history-list") {
        return addWorkHistoryGroup();
    }

    const container = document.getElementById(listId);
    if (!container) return;
    const dataType = container.getAttribute("data-type");

    const placeholders = {
        education: "○○高等学校 卒業 / Graduated from Tokyo High School",
        licenses: "普通自動車第一種運転免許 / Driver's License (Class 1)",
    };
    const placeholder = placeholders[dataType] || "";

    const prefixes = { education: "education", licenses: "license" };
    const prefix = prefixes[dataType] || dataType;

    const row = document.createElement("div");
    row.className = "dynamic-row";
    row.innerHTML = `
        <input type="number" class="input-year" name="${prefix}_year" placeholder="2018" min="1900" max="2100">
        <select class="input-month" name="${prefix}_month">
            <option value="">月 / Mo</option>
            ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
        </select>
        <input type="text" class="input-detail" name="${prefix}_detail" placeholder="${placeholder}">
        <button type="button" class="btn-remove" title="削除 / Remove">×</button>
    `;

    // Listen to changes in the new row
    row.querySelectorAll("input, select").forEach(el => {
        el.addEventListener("input", onFormChange);
        el.addEventListener("change", onFormChange);
    });

    container.appendChild(row);
}

function addWorkHistoryGroup() {
    const container = document.getElementById("work-history-list");
    if (!container) return null;

    const group = document.createElement("div");
    group.className = "work-item-group";
    group.innerHTML = `
        <div class="dynamic-row main-row">
            <input type="number" class="input-year" name="work_year" placeholder="2018" min="1900" max="2100">
            <select class="input-month" name="work_month">
                <option value="">月 / Mo</option>
                ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
            </select>
            <input type="text" class="input-detail" name="work_detail" placeholder="株式会社○○ 入社 / 派遣元会社 登録">
            <button type="button" class="btn-add-subitem" title="派遣先サブ項目を追加 / Add Dispatched Company (Haken)">+ 派遣先</button>
            <button type="button" class="btn-remove" title="削除 / Remove">×</button>
        </div>
        <div class="subitems-container" style="display: none;">
            <div class="subitems-header">
                <span class="subitems-title">↳ 派遣先詳細 / Dispatched Company Details</span>
                <div class="subitems-quick-actions">
                    <button type="button" class="btn-quick-tag" data-tag="派遣先">+ 派遣先に派遣</button>
                    <button type="button" class="btn-quick-tag" data-tag="満了">+ 期間満了</button>
                    <button type="button" class="btn-add-subitem-row">+ 項目追加</button>
                </div>
            </div>
            <div class="subitems-list"></div>
        </div>
    `;

    group.querySelectorAll(".main-row input, .main-row select").forEach(el => {
        el.addEventListener("input", onFormChange);
        el.addEventListener("change", onFormChange);
    });

    container.appendChild(group);
    return group;
}

function addSubItemRow(group, year = "", month = "", detail = "") {
    const subContainer = group.querySelector(".subitems-container");
    const subList = group.querySelector(".subitems-list");
    if (!subContainer || !subList) return null;

    subContainer.style.display = "flex";
    const subBtn = group.querySelector(".btn-add-subitem");
    if (subBtn) subBtn.classList.add("active");

    const row = document.createElement("div");
    row.className = "subitem-row";
    row.innerHTML = `
        <span class="subitem-bullet">↳</span>
        <input type="number" class="input-year-sub" placeholder="2018" min="1900" max="2100" value="${escapeHtmlAttr(year)}">
        <select class="input-month-sub">
            <option value="">月 / Mo</option>
            ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${String(month) === String(i + 1) ? 'selected' : ''}>${i + 1}</option>`).join("")}
        </select>
        <input type="text" class="input-detail-sub" placeholder="株式会社○○（派遣先）に派遣 / Dispatched to ○○ Corp." value="${escapeHtmlAttr(detail)}">
        <button type="button" class="btn-remove-sub" title="サブ項目を削除 / Remove Sub-item">×</button>
    `;

    row.querySelectorAll("input, select").forEach(el => {
        el.addEventListener("input", onFormChange);
        el.addEventListener("change", onFormChange);
    });

    subList.appendChild(row);
    return row;
}

function escapeHtmlAttr(str) {
    if (!str) return "";
    return String(str).replace(/"/g, "&quot;");
}

function removeDynamicRow(button) {
    const workGroup = button.closest(".work-item-group");
    if (workGroup) {
        const container = document.getElementById("work-history-list");
        const groups = container.querySelectorAll(".work-item-group");
        if (groups.length <= 1) {
            // Reset fields instead of leaving 0 rows
            const mainRow = workGroup.querySelector(".main-row");
            if (mainRow) {
                mainRow.querySelector(".input-year").value = "";
                mainRow.querySelector(".input-month").value = "";
                mainRow.querySelector(".input-detail").value = "";
            }
            const subList = workGroup.querySelector(".subitems-list");
            if (subList) subList.innerHTML = "";
            const subContainer = workGroup.querySelector(".subitems-container");
            if (subContainer) subContainer.style.display = "none";
            const subBtn = workGroup.querySelector(".btn-add-subitem");
            if (subBtn) subBtn.classList.remove("active");
            return;
        }
        workGroup.remove();
        return;
    }

    const row = button.closest(".dynamic-row");
    const container = row.closest(".dynamic-list");
    const rows = container.querySelectorAll(".dynamic-row");
    if (rows.length <= 1) {
        showToast("少なくとも1行は必要です / At least 1 row is required", "error");
        return;
    }
    row.remove();
}

// ============================================================
// Photo Handling
// ============================================================

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("画像ファイルを選択してください / Please select an image file", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("写真サイズは5MB以下にしてください / Max image size is 5MB", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentPhotoBase64 = e.target.result;
        const previewEl = document.getElementById("photo-preview");
        if (previewEl) {
            previewEl.innerHTML = `<img src="${currentPhotoBase64}" alt="Photo">`;
            previewEl.classList.add("has-photo");
        }
        const removeBtn = document.getElementById("btn-remove-photo");
        if (removeBtn) removeBtn.style.display = "inline-block";
        onFormChange();
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    currentPhotoBase64 = "";
    const fileInput = document.getElementById("photo");
    if (fileInput) fileInput.value = "";
    const previewEl = document.getElementById("photo-preview");
    if (previewEl) {
        previewEl.innerHTML = '<span class="photo-placeholder">写真<br><small>Photo</small></span>';
        previewEl.classList.remove("has-photo");
    }
    const removeBtn = document.getElementById("btn-remove-photo");
    if (removeBtn) removeBtn.style.display = "none";
    onFormChange();
}

// ============================================================
// Actions: Sample, Clear, Save, Load, Export PDF
// ============================================================

function loadSampleData() {
    populateForm(SAMPLE_DATA);
    showToast("サンプルデータを入力しました / Sample data loaded", "info");
}

function clearFormData() {
    populateForm({
        pdf_style: "bilingual",
        name_kanji: "",
        name_furigana: "",
        birth_date: "",
        gender: "男",
        photo: "",
        postal_code: "",
        address_furigana: "",
        address: "",
        phone: "",
        email: "",
        postal_code_2: "",
        address_furigana_2: "",
        address_2: "",
        phone_2: "",
        education: [{ year: "", month: "", detail: "" }],
        work_history: [{ year: "", month: "", detail: "" }],
        licenses: [{ year: "", month: "", detail: "" }],
        motivation: "",
        hobbies: "",
        commute_time: "",
        dependents_count: "0",
        has_spouse: false,
        spouse_support_obligation: false,
        requests: ""
    });
    localStorage.removeItem(STORAGE_KEY);
    showToast("フォームを初期化しました / Form cleared", "info");
}

function saveJSON() {
    const data = collectFormData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rirekisho_${data.name_kanji.replace(/[\s\/]/g, "_") || "data"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("データを保存しました / JSON data saved", "success");
}

function loadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            populateForm(data);
            showToast("データを読み込みました / Data loaded successfully", "success");
        } catch (err) {
            showToast("JSONの読み込みに失敗しました / Invalid JSON file", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = "";
}

/**
 * Export high-fidelity A4 PDF directly in pure JavaScript using html2pdf.js.
 */
function exportPDF() {
    const sheetEl = document.getElementById("printable-rirekisho");
    if (!sheetEl) return;

    showLoading("PDFを生成中 / Generating PDF...");
    const data = collectFormData();
    const filename = `履歴書_${data.name_kanji.replace(/[\s\/]/g, "_") || "rirekisho"}.pdf`;

    const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
        },
        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
        }
    };

    if (window.html2pdf) {
        window.html2pdf().set(opt).from(sheetEl).save().then(() => {
            hideLoading();
            showToast("PDFをダウンロードしました / PDF downloaded", "success");
        }).catch(err => {
            hideLoading();
            console.error("PDF export error:", err);
            // Fallback to window.print() if html2pdf fails
            showToast("印刷ダイアログを開きます / Opening print dialog", "info");
            window.print();
        });
    } else {
        hideLoading();
        window.print();
    }
}

// ============================================================
// Preview Zoom & Scaling Controls
// ============================================================

function setZoom(scale) {
    currentScale = Math.min(Math.max(scale, 0.4), 1.2);
    const wrapper = document.getElementById("a4-wrapper");
    const indicator = document.getElementById("zoom-indicator");
    if (wrapper) wrapper.style.transform = `scale(${currentScale})`;
    if (indicator) indicator.textContent = `${Math.round(currentScale * 100)}%`;
}

function autoFitScale() {
    const viewport = document.getElementById("preview-viewport");
    if (!viewport) return;
    // A4 width in pixels is ~794px at 96 DPI (210mm)
    const availableWidth = viewport.clientWidth - 40;
    const a4WidthPx = 794;
    const fitScale = Math.min(Math.max(availableWidth / a4WidthPx, 0.45), 1.0);
    setZoom(fitScale);
}

// ============================================================
// Utilities: Loading, Toasts, Debounce
// ============================================================

function showLoading(msg = "処理中 / Processing...") {
    const el = document.getElementById("loading-overlay");
    const textEl = document.getElementById("loading-message");
    if (textEl) textEl.textContent = msg;
    if (el) el.classList.add("active");
}

function hideLoading() {
    const el = document.getElementById("loading-overlay");
    if (el) el.classList.remove("active");
}

function showToast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    const timer = setTimeout(() => {
        toast.remove();
    }, duration);

    toast.addEventListener("click", () => {
        clearTimeout(timer);
        toast.remove();
    });
}

function debounce(fn, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

// ============================================================
// Theme Management (Light / Dark Mode)
// ============================================================

function initTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
        applyTheme(initialTheme, false);
    } catch {
        applyTheme("light", false);
    }
}

function applyTheme(theme, notify = false) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {}

    const iconEl = document.getElementById("theme-icon");
    const labelEl = document.getElementById("theme-label");
    if (theme === "dark") {
        if (iconEl) iconEl.textContent = "☀️";
        if (labelEl) labelEl.innerHTML = 'ライト <small>/ Light</small>';
    } else {
        if (iconEl) iconEl.textContent = "🌙";
        if (labelEl) labelEl.innerHTML = 'ダーク <small>/ Dark</small>';
    }

    if (notify) {
        showToast(
            theme === "dark" ? "ダークモードに切り替えました / Dark mode enabled" : "ライトモードに切り替えました / Light mode enabled",
            "info",
            1800
        );
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, true);
}

// Listen to OS color scheme changes if user hasn't explicitly set a preference
if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
        try {
            if (!localStorage.getItem(THEME_KEY)) {
                applyTheme(e.matches ? "dark" : "light", false);
            }
        } catch {}
    });
}
