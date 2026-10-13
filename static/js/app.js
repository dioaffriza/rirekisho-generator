/* ============================================================
   履歴書メーカー — Application Logic
   ============================================================ */

// ---------- State ----------
let photoBase64 = '';

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', () => {
    // Button handlers
    document.getElementById('btn-generate').addEventListener('click', generatePDF);
    document.getElementById('btn-preview').addEventListener('click', previewPDF);
    document.getElementById('btn-sample').addEventListener('click', loadSampleData);
    document.getElementById('btn-clear').addEventListener('click', clearFormData);
    document.getElementById('btn-save').addEventListener('click', saveFormData);
    document.getElementById('btn-load').addEventListener('click', () => {
        document.getElementById('json-file-input').click();
    });
    document.getElementById('btn-download-font').addEventListener('click', downloadFont);
    document.getElementById('btn-remove-photo').addEventListener('click', removePhoto);

    // JSON file load handler
    document.getElementById('json-file-input').addEventListener('change', loadFormData);

    // Photo upload handler
    document.getElementById('photo').addEventListener('change', handlePhotoUpload);

    // Birth date calculation handler
    document.getElementById('birth_date').addEventListener('input', updateBirthDateCalc);

    // PDF style change handler
    document.getElementById('pdf_style')?.addEventListener('change', () => {
        const iframe = document.getElementById('pdf-preview');
        if (iframe && iframe.classList.contains('active')) {
            previewPDF();
        }
    });

    // Dynamic list: add-row buttons
    document.querySelectorAll('.btn-add-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            addDynamicRow(targetId);
        });
    });

    // Dynamic list: remove buttons (event delegation)
    document.querySelectorAll('.dynamic-list').forEach(list => {
        list.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove')) {
                removeDynamicRow(e.target);
            }
        });
    });
});

// ============================================================
// Form Data Collection
// ============================================================

/**
 * Collect all form field values and return the data object
 * matching the API JSON schema.
 */
function collectFormData() {
    const data = {
        pdf_style: document.getElementById('pdf_style')?.value || 'bilingual',
        name_kanji: val('name_kanji'),
        name_furigana: val('name_furigana'),
        birth_date: val('birth_date'),
        gender: document.querySelector('input[name="gender"]:checked')?.value || '',
        photo: photoBase64,
        postal_code: val('postal_code'),
        address_furigana: val('address_furigana'),
        address: val('address'),
        phone: val('phone'),
        email: val('email'),
        postal_code_2: val('postal_code_2'),
        address_furigana_2: val('address_furigana_2'),
        address_2: val('address_2'),
        phone_2: val('phone_2'),
        education: collectDynamicList('education-list'),
        work_history: collectDynamicList('work-history-list'),
        licenses: collectDynamicList('licenses-list'),
        motivation: val('motivation'),
        hobbies: val('hobbies'),
        commute_time: val('commute_time'),
        dependents_count: val('dependents_count') || '0',
        has_spouse: document.getElementById('has_spouse').checked,
        spouse_support_obligation: document.getElementById('spouse_support_obligation').checked,
        requests: val('requests'),
    };
    return data;
}

/**
 * Shorthand to get a form element's value by id.
 */
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

/**
 * Collect rows from a dynamic list container.
 * Returns an array of { year, month, detail }.
 */
function collectDynamicList(listId) {
    const container = document.getElementById(listId);
    const rows = container.querySelectorAll('.dynamic-row');
    const items = [];
    rows.forEach(row => {
        items.push({
            year: row.querySelector('.input-year')?.value.trim() || '',
            month: row.querySelector('.input-month')?.value || '',
            detail: row.querySelector('.input-detail')?.value.trim() || '',
        });
    });
    return items;
}

// ============================================================
// Dynamic List Management
// ============================================================

/**
 * Add a new empty row to the specified dynamic list.
 */
function addDynamicRow(listId) {
    const container = document.getElementById(listId);
    const dataType = container.getAttribute('data-type');

    // Build placeholder text based on list type
    const placeholders = {
        education: '○○高等学校 入学',
        work_history: '株式会社○○ 入社',
        licenses: '普通自動車第一種運転免許 取得',
    };
    const placeholder = placeholders[dataType] || '';

    // Build name prefixes based on list type
    const prefixes = {
        education: 'education',
        work_history: 'work',
        licenses: 'license',
    };
    const prefix = prefixes[dataType] || dataType;

    // Create row element
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
        <input type="number" class="input-year" name="${prefix}_year" placeholder="2020" min="1900" max="2100">
        <select class="input-month" name="${prefix}_month">
            <option value="">月</option>
            ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
        </select>
        <input type="text" class="input-detail" name="${prefix}_detail" placeholder="${placeholder}">
        <button type="button" class="btn-remove" title="削除">×</button>
    `;

    container.appendChild(row);
}

/**
 * Remove a dynamic row. Keeps at least one row in the list.
 */
function removeDynamicRow(button) {
    const row = button.closest('.dynamic-row');
    const container = row.closest('.dynamic-list');
    const rows = container.querySelectorAll('.dynamic-row');

    if (rows.length <= 1) {
        showToast('少なくとも1行は必要です。', 'error');
        return;
    }

    row.remove();
}

// ============================================================
// Photo Handling
// ============================================================

/**
 * Handle photo file selection: read as base64 data URI and show preview.
 */
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('画像ファイルを選択してください。', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('写真のサイズは5MB以下にしてください。', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        photoBase64 = e.target.result;
        const previewEl = document.getElementById('photo-preview');
        previewEl.innerHTML = `<img src="${photoBase64}" alt="写真プレビュー">`;
        previewEl.classList.add('has-photo');
        const removeBtn = document.getElementById('btn-remove-photo');
        if (removeBtn) removeBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

/**
 * Remove uploaded photo and restore placeholder.
 */
function removePhoto() {
    photoBase64 = '';
    const fileInput = document.getElementById('photo');
    if (fileInput) fileInput.value = '';
    const previewEl = document.getElementById('photo-preview');
    previewEl.innerHTML = '<span class="photo-placeholder">写真</span>';
    previewEl.classList.remove('has-photo');
    const removeBtn = document.getElementById('btn-remove-photo');
    if (removeBtn) removeBtn.style.display = 'none';
}

// ============================================================
// PDF Generation & Preview
// ============================================================

/**
 * Generate PDF and trigger a file download.
 */
async function generatePDF() {
    const data = collectFormData();
    showLoading('PDFを生成中...');
    setButtonsDisabled(true);

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `サーバーエラー (${response.status})`);
        }

        // Trigger file download from blob
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Use filename from Content-Disposition header if available
        const disposition = response.headers.get('Content-Disposition');
        let filename = '履歴書.pdf';
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i);
            if (match) {
                filename = decodeURIComponent(match[1]);
            }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('PDFを生成しました。', 'success');
    } catch (err) {
        console.error('PDF generation error:', err);
        showToast(`PDF生成に失敗しました: ${err.message}`, 'error');
    } finally {
        hideLoading();
        setButtonsDisabled(false);
    }
}

/**
 * Generate a preview PDF and display it in the iframe.
 */
async function previewPDF() {
    const data = collectFormData();
    showLoading('プレビューを生成中...');
    setButtonsDisabled(true);

    try {
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `サーバーエラー (${response.status})`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const iframe = document.getElementById('pdf-preview');
        const placeholder = document.getElementById('preview-placeholder');

        // Revoke previous blob URL if set
        if (iframe.dataset.blobUrl) {
            URL.revokeObjectURL(iframe.dataset.blobUrl);
        }

        iframe.src = url;
        iframe.dataset.blobUrl = url;
        iframe.classList.add('active');
        placeholder.classList.add('hidden');

        showToast('プレビューを更新しました。', 'success');
    } catch (err) {
        console.error('Preview error:', err);
        showToast(`プレビュー生成に失敗しました: ${err.message}`, 'error');
    } finally {
        hideLoading();
        setButtonsDisabled(false);
    }
}

// ============================================================
// Save / Load JSON
// ============================================================

/**
 * Save the current form data as a downloadable JSON file.
 */
function saveFormData() {
    try {
        const data = collectFormData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'rirekisho_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('データを保存しました。', 'success');
    } catch (err) {
        console.error('Save error:', err);
        showToast(`データ保存に失敗しました: ${err.message}`, 'error');
    }
}

/**
 * Load form data from a selected JSON file.
 */
function loadFormData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            populateForm(data);
            showToast('データを読み込みました。', 'success');
        } catch (err) {
            console.error('Load error:', err);
            showToast(`データの読み込みに失敗しました: ${err.message}`, 'error');
        }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be loaded again
    event.target.value = '';
}

/**
 * Populate all form fields from a data object.
 */
function populateForm(data) {
    // Simple text/date/number fields
    const simpleFields = [
        'name_kanji', 'name_furigana', 'birth_date',
        'postal_code', 'address_furigana', 'address', 'phone', 'email',
        'postal_code_2', 'address_furigana_2', 'address_2', 'phone_2',
        'motivation', 'hobbies', 'commute_time', 'dependents_count', 'requests',
    ];

    simpleFields.forEach(field => {
        const el = document.getElementById(field);
        if (el && data[field] !== undefined) {
            el.value = data[field];
        }
    });

    // Gender radio
    if (data.gender) {
        const radio = document.querySelector(`input[name="gender"][value="${data.gender}"]`);
        if (radio) radio.checked = true;
    }

    // Checkboxes
    if (data.has_spouse !== undefined) {
        document.getElementById('has_spouse').checked = !!data.has_spouse;
    }
    if (data.spouse_support_obligation !== undefined) {
        document.getElementById('spouse_support_obligation').checked = !!data.spouse_support_obligation;
    }

    // Photo
    if (data.photo) {
        photoBase64 = data.photo;
        const previewEl = document.getElementById('photo-preview');
        previewEl.innerHTML = `<img src="${photoBase64}" alt="写真プレビュー">`;
        previewEl.classList.add('has-photo');
        const removeBtn = document.getElementById('btn-remove-photo');
        if (removeBtn) removeBtn.style.display = 'inline-block';
    } else {
        removePhoto();
    }

    // Dynamic lists
    populateDynamicList('education-list', data.education);
    populateDynamicList('work-history-list', data.work_history);
    populateDynamicList('licenses-list', data.licenses);

    if (data.pdf_style) {
        const styleSelect = document.getElementById('pdf_style');
        if (styleSelect) styleSelect.value = data.pdf_style;
    }

    updateBirthDateCalc();
}

/**
 * Populate a dynamic list container with rows from data.
 * Clears existing rows and creates new ones.
 */
function populateDynamicList(listId, items) {
    const container = document.getElementById(listId);
    if (!container || !items) return;

    // Remove existing dynamic rows (keep the header)
    container.querySelectorAll('.dynamic-row').forEach(row => row.remove());

    // Ensure at least one row
    const entries = items.length > 0 ? items : [{ year: '', month: '', detail: '' }];

    entries.forEach(item => {
        addDynamicRow(listId);
        const rows = container.querySelectorAll('.dynamic-row');
        const lastRow = rows[rows.length - 1];

        if (item.year) lastRow.querySelector('.input-year').value = item.year;
        if (item.month) lastRow.querySelector('.input-month').value = item.month;
        if (item.detail) lastRow.querySelector('.input-detail').value = item.detail;
    });
}

// ============================================================
// Sample Data & Clear
// ============================================================

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
        { year: "2018", month: "4", detail: "株式会社サンプル商事 入社 / Sample Corp. (Backend Engineer)" },
        { year: "2023", month: "3", detail: "一身上の都合により退職 / Resigned for personal reasons" }
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

/**
 * Load realistic sample data into the form and trigger live preview.
 */
function loadSampleData() {
    populateForm(SAMPLE_DATA);
    showToast('サンプルデータを入力しました / Sample data loaded', 'info');
    previewPDF();
}

/**
 * Clear all fields in the form.
 */
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
    updateBirthDateCalc();
    showToast('フォームを初期化しました / Form cleared', 'info');
}

/**
 * Update Japanese era and age calculation helper below birth date input.
 */
function updateBirthDateCalc() {
    const val = document.getElementById('birth_date')?.value;
    const calcEl = document.getElementById('birth_date_calc');
    if (!calcEl) return;

    if (!val) {
        calcEl.textContent = '';
        return;
    }

    const [y, m, d] = val.split('-').map(Number);
    if (!y || !m || !d) {
        calcEl.textContent = '';
        return;
    }

    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const mDiff = today.getMonth() - birth.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    let era = '';
    if (birth >= new Date(2019, 4, 1)) {
        const eraYear = y - 2019 + 1;
        era = `令和${eraYear === 1 ? '元' : eraYear}年`;
    } else if (birth >= new Date(1989, 0, 8)) {
        const eraYear = y - 1989 + 1;
        era = `平成${eraYear === 1 ? '元' : eraYear}年`;
    } else if (birth >= new Date(1926, 11, 25)) {
        const eraYear = y - 1926 + 1;
        era = `昭和${eraYear === 1 ? '元' : eraYear}年`;
    } else {
        era = `${y}年`;
    }

    calcEl.textContent = `${era}${m}月${d}日生（満 ${age} 歳）`;
}

// ============================================================
// Font Download
// ============================================================

/**
 * Request the server to download the Japanese font for PDF rendering.
 */
async function downloadFont() {
    showLoading('フォントをダウンロード中...');
    setButtonsDisabled(true);

    try {
        const response = await fetch('/api/download-font', {
            method: 'POST',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `サーバーエラー (${response.status})`);
        }

        const result = await response.json();
        showToast(result.message || 'フォントのダウンロードが完了しました。', 'success');
    } catch (err) {
        console.error('Font download error:', err);
        showToast(`フォントダウンロードに失敗しました: ${err.message}`, 'error');
    } finally {
        hideLoading();
        setButtonsDisabled(false);
    }
}

// ============================================================
// UI Feedback: Loading Overlay
// ============================================================

/**
 * Show the full-screen loading overlay with a message.
 */
function showLoading(message = '処理中...') {
    const overlay = document.getElementById('loading-overlay');
    const msgEl = document.getElementById('loading-message');
    msgEl.textContent = message;
    overlay.classList.add('active');
}

/**
 * Hide the loading overlay.
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('active');
}

/**
 * Enable or disable all action buttons in the header.
 */
function setButtonsDisabled(disabled) {
    document.querySelectorAll('.header-actions .btn').forEach(btn => {
        btn.disabled = disabled;
    });
}

// ============================================================
// UI Feedback: Toast Notifications
// ============================================================

/**
 * Show a toast notification.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'} type - The toast type.
 * @param {number} duration - Auto-dismiss time in milliseconds.
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
        dismissToast(toast);
    }, duration);

    // Allow click to dismiss early
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        dismissToast(toast);
    });
    toast.style.cursor = 'pointer';
}

/**
 * Dismiss a toast element with an exit animation.
 */
function dismissToast(toast) {
    if (toast.classList.contains('toast-out')) return;
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}
