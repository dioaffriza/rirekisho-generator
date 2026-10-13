"""
Japanese 履歴書 (Rirekisho) PDF Generator.

Renders a standard JIS-format rirekisho on A4 paper using ReportLab.
Supports both Bilingual (Japanese & English side-by-side) and Japanese-only formats.
Supports IPAex Mincho, IPAex Gothic, or built-in HeiseiMin-W3 as font fallback.
"""

import base64
import io
import os
import zipfile
from datetime import date

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import era_converter

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PAGE_WIDTH, PAGE_HEIGHT = A4  # 595.27 x 841.89 points

# Margins
LEFT_MARGIN = 14 * mm
RIGHT_MARGIN = PAGE_WIDTH - 14 * mm
TOP_MARGIN = PAGE_HEIGHT - 12 * mm
BOTTOM_MARGIN = 12 * mm

# Font sizes
FONT_TITLE = 16
FONT_SECTION = 10
FONT_BODY = 9.5
FONT_LABEL = 7.5
FONT_SMALL = 6.2

# Line width for table borders
BORDER_WIDTH = 0.5

# Photo dimensions (standard rirekisho: 3cm × 4cm)
PHOTO_W = 30 * mm
PHOTO_H = 40 * mm

# Module directory for resolving font paths
_MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
_FONTS_DIR = os.path.join(_MODULE_DIR, "fonts")

# ---------------------------------------------------------------------------
# Font registration
# ---------------------------------------------------------------------------

JP_FONT = None


def _register_fonts() -> str:
    """Register a Japanese font with ReportLab and return its name."""
    mincho_path = os.path.join(_FONTS_DIR, "ipaexm.ttf")
    if os.path.isfile(mincho_path):
        pdfmetrics.registerFont(TTFont("IPAexMincho", mincho_path))
        return "IPAexMincho"

    gothic_path = os.path.join(_FONTS_DIR, "ipaexg.ttf")
    if os.path.isfile(gothic_path):
        pdfmetrics.registerFont(TTFont("IPAexGothic", gothic_path))
        return "IPAexGothic"

    pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))
    return "HeiseiMin-W3"


JP_FONT = _register_fonts()

# ---------------------------------------------------------------------------
# Font download helper
# ---------------------------------------------------------------------------

_FONT_URL = "https://moji.or.jp/wp-content/ipafont/IPAexfont/ipaexm00401.zip"


def download_font():
    """Download IPAex Mincho font if not already present."""
    global JP_FONT

    dest_path = os.path.join(_FONTS_DIR, "ipaexm.ttf")
    if os.path.isfile(dest_path):
        return

    import urllib.request

    os.makedirs(_FONTS_DIR, exist_ok=True)

    with urllib.request.urlopen(_FONT_URL, timeout=60) as resp:
        zip_data = resp.read()

    with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
        for name in zf.namelist():
            if name.endswith("ipaexm.ttf"):
                with zf.open(name) as src, open(dest_path, "wb") as dst:
                    dst.write(src.read())
                break
        else:
            raise FileNotFoundError("ipaexm.ttf not found inside the downloaded archive")

    JP_FONT = _register_fonts()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _decode_photo(data_uri: str) -> io.BytesIO | None:
    """Decode a base64 data-URI image into a BytesIO buffer."""
    if not data_uri:
        return None

    try:
        header, encoded = data_uri.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        buf = io.BytesIO(image_bytes)
        buf.seek(0)
        return buf
    except Exception:
        return None


def _safe_str(value) -> str:
    """Return value as a string, defaulting to '' for None."""
    if value is None:
        return ""
    return str(value).strip()


def _wrap_text(text: str, font_name: str, font_size: float, max_width: float) -> list[str]:
    """Wrap text to fit within max_width points using precise font metrics."""
    if not text:
        return []

    lines = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        cur = ""
        for char in paragraph:
            test = cur + char
            if pdfmetrics.stringWidth(test, font_name, font_size) <= max_width:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = char
        if cur:
            lines.append(cur)
    return lines


# ---------------------------------------------------------------------------
# PDF Generation
# ---------------------------------------------------------------------------


def generate_rirekisho_pdf(data: dict) -> bytes:
    """
    Generate a rirekisho PDF from form data.

    Supports data['pdf_style'] == 'bilingual' (default) or 'japanese'.

    Returns:
        The rendered PDF document as raw bytes.
    """
    bilingual = data.get("pdf_style", "bilingual") != "japanese"

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle("履歴書 / Curriculum Vitae" if bilingual else "履歴書")

    y_bottom_top_half = _draw_top_half(c, data, bilingual)
    _draw_bottom_half(c, data, y_bottom_top_half, bilingual)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


# ── Top half ──────────────────────────────────────────────────────────────


def _draw_top_half(c: canvas.Canvas, data: dict, bilingual: bool) -> float:
    """Draw the upper portion of the rirekisho (personal information)."""
    font = JP_FONT
    table_left = LEFT_MARGIN
    table_right = RIGHT_MARGIN

    # ── Title ─────────────────────────────────────────────────────────
    if bilingual:
        c.setFont(font, FONT_TITLE)
        c.drawCentredString((table_left + table_right) / 2, TOP_MARGIN - 3.5 * mm, "履　歴　書")
        c.setFont(font, 7.5)
        c.drawCentredString((table_left + table_right) / 2, TOP_MARGIN - 7.5 * mm, "CURRICULUM VITAE")
    else:
        c.setFont(font, FONT_TITLE)
        c.drawCentredString((table_left + table_right) / 2, TOP_MARGIN - 4 * mm, "履　歴　書")

    # Date line (right-aligned)
    today = date.today()
    era_name, era_year = era_converter.western_to_era(today.year, today.month, today.day)
    date_str = f"{era_name}{era_year}年{today.month}月{today.day}日現在"
    if bilingual:
        date_str += f" / As of {today.strftime('%b %d, %Y')}"
    c.setFont(font, FONT_BODY if not bilingual else 8)
    c.drawRightString(table_right, TOP_MARGIN - 10.5 * mm, date_str)

    # ── Coordinates ───────────────────────────────────────────────────
    table_top = TOP_MARGIN - 13 * mm
    c.setLineWidth(BORDER_WIDTH)

    # Photo box dimensions
    photo_w = PHOTO_W  # 30mm
    photo_h = PHOTO_H  # 40mm
    photo_x = table_right - photo_w
    photo_y = table_top - photo_h

    # Info area to the left of the photo
    info_left = table_left
    info_right = photo_x
    info_w = info_right - info_left

    # Row 1: ふりがな (7mm)
    r1_h = 7 * mm
    r1_top = table_top
    r1_bot = r1_top - r1_h

    c.rect(info_left, r1_bot, info_w, r1_h)
    if bilingual:
        c.setFont(font, FONT_LABEL)
        c.drawString(info_left + 2 * mm, r1_bot + 3.8 * mm, "ふりがな")
        c.setFont(font, FONT_SMALL)
        c.drawString(info_left + 2 * mm, r1_bot + 1.2 * mm, "Furigana")
    else:
        c.setFont(font, FONT_LABEL)
        c.drawString(info_left + 2 * mm, r1_bot + 2 * mm, "ふりがな")

    c.setFont(font, FONT_BODY)
    c.drawString(info_left + 22 * mm, r1_bot + 2 * mm, _safe_str(data.get("name_furigana")))

    # Row 2: 氏名 (24mm)
    r2_h = 24 * mm
    r2_top = r1_bot
    r2_bot = r2_top - r2_h

    c.rect(info_left, r2_bot, info_w, r2_h)
    if bilingual:
        c.setFont(font, FONT_LABEL)
        c.drawString(info_left + 2 * mm, r2_top - 5 * mm, "氏　名")
        c.setFont(font, FONT_SMALL)
        c.drawString(info_left + 2 * mm, r2_top - 8.5 * mm, "Full Name")
    else:
        c.setFont(font, FONT_LABEL)
        c.drawString(info_left + 2 * mm, r2_top - 5 * mm, "氏　名")

    c.setFont(font, 16)
    c.drawString(info_left + 22 * mm, r2_bot + 7 * mm, _safe_str(data.get("name_kanji")))

    # Row 3: 生年月日 & 性別 (9mm) -> Exactly fills 7 + 24 + 9 = 40mm (photo_h)!
    r3_h = 9 * mm
    r3_top = r2_bot
    r3_bot = r3_top - r3_h

    c.rect(info_left, r3_bot, info_w, r3_h)
    if bilingual:
        c.setFont(font, FONT_LABEL)
        c.drawString(info_left + 2 * mm, r3_bot + 4.5 * mm, "生年月日")
        c.setFont(font, FONT_SMALL)
        c.drawString(info_left + 2 * mm, r3_bot + 1.5 * mm, "Date of Birth")
    else:
        c.setFont(font, FONT_LABEL)
        c.drawString(info_left + 2 * mm, r3_bot + 3 * mm, "生年月日")

    birth_str = _safe_str(data.get("birth_date"))
    if birth_str:
        parts = birth_str.split("-")
        if len(parts) == 3:
            b_year, b_month, b_day = int(parts[0]), int(parts[1]), int(parts[2])
            e_name, e_year = era_converter.western_to_era(b_year, b_month, b_day)
            year_label = "元" if e_year == 1 else str(e_year)
            age = era_converter.calculate_age(birth_str)
            if bilingual:
                birth_display = f"{e_name}{year_label}年{b_month}月{b_day}日（満 {age} 歳 / Age: {age}）"
            else:
                birth_display = f"{e_name}{year_label}年{b_month}月{b_day}日生（満 {age} 歳）"
            c.setFont(font, FONT_BODY if not bilingual else 8.5)
            c.drawString(info_left + 22 * mm, r3_bot + 3 * mm, birth_display)

    # Gender divider inside row 3
    gender_box_w = 26 * mm if bilingual else 20 * mm
    c.line(info_right - gender_box_w, r3_bot, info_right - gender_box_w, r3_top)
    gender = _safe_str(data.get("gender"))
    if gender:
        if bilingual:
            gender_text = "男 (Male)" if gender == "男" else ("女 (Female)" if gender == "女" else gender)
        else:
            gender_text = gender
        c.setFont(font, FONT_BODY if not bilingual else 8)
        c.drawCentredString(info_right - gender_box_w / 2, r3_bot + 3 * mm, gender_text)

    # ── Photo Box (30mm x 40mm) ────────────────────────────────────────
    c.rect(photo_x, photo_y, photo_w, photo_h)
    photo_buf = _decode_photo(data.get("photo", ""))
    if photo_buf:
        try:
            from PIL import Image as PILImage
            from reportlab.lib.utils import ImageReader

            pil_img = PILImage.open(photo_buf)
            clean_buf = io.BytesIO()
            pil_img.save(clean_buf, format="PNG")
            clean_buf.seek(0)

            img_reader = ImageReader(clean_buf)
            pad = 1.5 * mm
            c.drawImage(
                img_reader,
                photo_x + pad,
                photo_y + pad,
                width=photo_w - 2 * pad,
                height=photo_h - 2 * pad,
                preserveAspectRatio=True,
                anchor="c",
            )
        except Exception:
            _draw_photo_placeholder(c, font, photo_x, photo_y, photo_w, photo_h, bilingual)
    else:
        _draw_photo_placeholder(c, font, photo_x, photo_y, photo_w, photo_h, bilingual)

    # ── Address Section (現住所) ──────────────────────────────────────
    addr_top = photo_y
    full_w = table_right - table_left

    # Row 4: ふりがな (5.5mm)
    r4_h = 5.5 * mm
    r4_bot = addr_top - r4_h
    c.rect(table_left, r4_bot, full_w, r4_h)
    c.setFont(font, FONT_LABEL)
    c.drawString(table_left + 2 * mm, r4_bot + 1.5 * mm, "ふりがな / Furigana" if bilingual else "ふりがな")
    c.setFont(font, FONT_SMALL)
    c.drawString(table_left + 32 * mm if bilingual else table_left + 22 * mm, r4_bot + 1.5 * mm, _safe_str(data.get("address_furigana")))

    # Row 5: 現住所 (15mm)
    r5_h = 15 * mm
    r5_bot = r4_bot - r5_h
    c.rect(table_left, r5_bot, full_w, r5_h)
    if bilingual:
        c.setFont(font, FONT_LABEL)
        c.drawString(table_left + 2 * mm, r4_bot - 4.5 * mm, "現住所")
        c.setFont(font, FONT_SMALL)
        c.drawString(table_left + 2 * mm, r4_bot - 8 * mm, "Address")
    else:
        c.setFont(font, FONT_LABEL)
        c.drawString(table_left + 2 * mm, r4_bot - 4 * mm, "現住所")

    postal = _safe_str(data.get("postal_code"))
    postal_text = f"〒 {postal}" if postal else "〒"
    c.setFont(font, FONT_BODY)
    c.drawString(table_left + 22 * mm, r5_bot + 9.5 * mm, postal_text)
    c.drawString(table_left + 22 * mm, r5_bot + 3.5 * mm, _safe_str(data.get("address")))

    # Row 6: 電話 / E-mail (7.5mm)
    r6_h = 7.5 * mm
    r6_bot = r5_bot - r6_h
    c.rect(table_left, r6_bot, full_w, r6_h)

    # Left half: Phone
    mid_x = table_left + full_w * 0.5
    c.line(mid_x, r6_bot, mid_x, r5_bot)

    c.setFont(font, FONT_LABEL)
    c.drawString(table_left + 2 * mm, r6_bot + 2.5 * mm, "電話 / Tel" if bilingual else "電話")
    c.setFont(font, FONT_BODY)
    c.drawString(table_left + 20 * mm if bilingual else table_left + 16 * mm, r6_bot + 2.5 * mm, _safe_str(data.get("phone")))

    # Right half: E-mail
    c.setFont(font, FONT_LABEL)
    c.drawString(mid_x + 2 * mm, r6_bot + 2.5 * mm, "E-mail")
    c.setFont(font, FONT_BODY)
    c.drawString(mid_x + 16 * mm, r6_bot + 2.5 * mm, _safe_str(data.get("email")))

    # ── Contact Section 2 (連絡先) ───────────────────────────────────
    # Row 7: ふりがな (5.5mm)
    r7_h = 5.5 * mm
    r7_bot = r6_bot - r7_h
    c.rect(table_left, r7_bot, full_w, r7_h)
    c.setFont(font, FONT_LABEL)
    c.drawString(table_left + 2 * mm, r7_bot + 1.5 * mm, "ふりがな / Furigana" if bilingual else "ふりがな")
    c.setFont(font, FONT_SMALL)
    c.drawString(table_left + 32 * mm if bilingual else table_left + 22 * mm, r7_bot + 1.5 * mm, _safe_str(data.get("address_furigana_2")))

    # Row 8: 連絡先 (14mm)
    r8_h = 14 * mm
    r8_bot = r7_bot - r8_h
    c.rect(table_left, r8_bot, full_w, r8_h)
    if bilingual:
        c.setFont(font, FONT_LABEL)
        c.drawString(table_left + 2 * mm, r8_bot + 8.5 * mm, "連絡先")
        c.setFont(font, FONT_SMALL)
        c.drawString(table_left + 2 * mm, r8_bot + 4 * mm, "Contact")
    else:
        c.setFont(font, FONT_LABEL)
        c.drawString(table_left + 2 * mm, r8_bot + 8.5 * mm, "連絡先")
        c.setFont(font, FONT_SMALL)
        c.drawString(table_left + 2 * mm, r8_bot + 3 * mm, "(現住所以外)")

    postal2 = _safe_str(data.get("postal_code_2"))
    addr2 = _safe_str(data.get("address_2"))
    c.setFont(font, FONT_BODY)
    if postal2 or addr2:
        if postal2:
            c.drawString(table_left + 22 * mm, r8_bot + 8.5 * mm, f"〒 {postal2}")
        c.drawString(table_left + 22 * mm, r8_bot + 3 * mm, addr2)
    else:
        c.setFont(font, FONT_SMALL)
        note = "（現住所以外に連絡を希望する場合のみ記入 / Only if different from address）" if bilingual else "（現住所以外に連絡を希望する場合のみ記入）"
        c.drawString(table_left + 22 * mm, r8_bot + 5 * mm, note)

    # Row 9: 連絡先 電話 (7.5mm)
    r9_h = 7.5 * mm
    r9_bot = r8_bot - r9_h
    c.rect(table_left, r9_bot, full_w, r9_h)
    c.setFont(font, FONT_LABEL)
    c.drawString(table_left + 2 * mm, r9_bot + 2.5 * mm, "電話 / Tel" if bilingual else "電話")
    c.setFont(font, FONT_BODY)
    c.drawString(table_left + 20 * mm if bilingual else table_left + 16 * mm, r9_bot + 2.5 * mm, _safe_str(data.get("phone_2")))

    return r9_bot


def _draw_photo_placeholder(c, font, x, y, w, h, bilingual: bool):
    """Draw a '写真' placeholder label inside the photo box."""
    c.setFont(font, FONT_LABEL)
    c.drawCentredString(x + w / 2, y + h / 2 + 5 * mm, "写　真 / Photo" if bilingual else "写　真")
    c.setFont(font, FONT_SMALL)
    c.drawCentredString(x + w / 2, y + h / 2 - 1 * mm, "縦 4cm × 横 3cm")
    c.drawCentredString(x + w / 2, y + h / 2 - 5 * mm, "写真貼付 / Affix Photo" if bilingual else "写真を貼る位置")


# ── Bottom half ───────────────────────────────────────────────────────────


def _draw_bottom_half(c: canvas.Canvas, data: dict, y_top: float, bilingual: bool):
    """Draw the lower portion of the rirekisho (history, licenses, etc.)."""
    font = JP_FONT
    c.setLineWidth(BORDER_WIDTH)

    section_left = LEFT_MARGIN
    section_right = RIGHT_MARGIN
    full_w = section_right - section_left

    # Column widths for history and license tables
    year_col_w = 18 * mm
    month_col_w = 12 * mm
    detail_col_left = section_left + year_col_w + month_col_w
    detail_w = section_right - detail_col_left

    row_h = 6.6 * mm

    # Gap between top profile and history section
    y = y_top - 3.5 * mm

    # ── 学歴・職歴 Table Header ───────────────────────────────────────
    c.rect(section_left, y - row_h, year_col_w, row_h)
    c.rect(section_left + year_col_w, y - row_h, month_col_w, row_h)
    c.rect(detail_col_left, y - row_h, detail_w, row_h)

    if bilingual:
        c.setFont(font, 8)
        c.drawCentredString(section_left + year_col_w / 2, y - row_h + 3.6 * mm, "年")
        c.setFont(font, FONT_SMALL)
        c.drawCentredString(section_left + year_col_w / 2, y - row_h + 1.2 * mm, "Year")

        c.setFont(font, 8)
        c.drawCentredString(section_left + year_col_w + month_col_w / 2, y - row_h + 3.6 * mm, "月")
        c.setFont(font, FONT_SMALL)
        c.drawCentredString(section_left + year_col_w + month_col_w / 2, y - row_h + 1.2 * mm, "Month")

        c.setFont(font, 9)
        c.drawCentredString(detail_col_left + detail_w / 2, y - row_h + 3.6 * mm, "学　歴　・　職　歴")
        c.setFont(font, FONT_SMALL)
        c.drawCentredString(detail_col_left + detail_w / 2, y - row_h + 1.2 * mm, "Academic & Employment History")
    else:
        c.setFont(font, FONT_SECTION)
        c.drawCentredString(section_left + year_col_w / 2, y - row_h + 2 * mm, "年")
        c.drawCentredString(section_left + year_col_w + month_col_w / 2, y - row_h + 2 * mm, "月")
        c.drawCentredString(detail_col_left + detail_w / 2, y - row_h + 2 * mm, "学　歴　・　職　歴")

    y -= row_h

    def _draw_table_row(y_pos, year_str="", month_str="", detail_str="", center_detail=False):
        c.rect(section_left, y_pos - row_h, year_col_w, row_h)
        c.rect(section_left + year_col_w, y_pos - row_h, month_col_w, row_h)
        c.rect(detail_col_left, y_pos - row_h, detail_w, row_h)

        c.setFont(font, FONT_BODY)
        if year_str:
            c.drawCentredString(section_left + year_col_w / 2, y_pos - row_h + 2 * mm, year_str)
        if month_str:
            c.drawCentredString(section_left + year_col_w + month_col_w / 2, y_pos - row_h + 2 * mm, month_str)
        if detail_str:
            if center_detail:
                c.drawCentredString(detail_col_left + detail_w / 2, y_pos - row_h + 2 * mm, detail_str)
            else:
                c.drawString(detail_col_left + 2 * mm, y_pos - row_h + 2 * mm, detail_str)
        return y_pos - row_h

    # Build the combined rows for Education and Work History
    history_entries = []

    # 1. 学歴 title row
    ed_label = "学　歴 / Education" if bilingual else "学　歴"
    history_entries.append(("", "", ed_label, True))

    # Education rows
    for entry in data.get("education", []):
        yr = _safe_str(entry.get("year"))
        mo = _safe_str(entry.get("month"))
        detail = _safe_str(entry.get("detail"))
        era_yr = ""
        if yr:
            try:
                m = int(mo) if mo else 1
                formatted = era_converter.format_date_japanese(int(yr), m)
                era_yr = formatted.split("年")[0] + "年"
            except (ValueError, TypeError):
                era_yr = yr
        if yr or mo or detail:
            history_entries.append((era_yr, mo, detail, False))

    # 2. 職歴 title row
    wk_label = "職　歴 / Work History" if bilingual else "職　歴"
    history_entries.append(("", "", wk_label, True))

    # Work history rows
    for entry in data.get("work_history", []):
        yr = _safe_str(entry.get("year"))
        mo = _safe_str(entry.get("month"))
        detail = _safe_str(entry.get("detail"))
        era_yr = ""
        if yr:
            try:
                m = int(mo) if mo else 1
                formatted = era_converter.format_date_japanese(int(yr), m)
                era_yr = formatted.split("年")[0] + "年"
            except (ValueError, TypeError):
                era_yr = yr
        if yr or mo or detail:
            history_entries.append((era_yr, mo, detail, False))

    # 3. 以上 row
    end_label = "以上 / End" if bilingual else "以上"
    history_entries.append(("", "", end_label, "right"))

    # Render fixed number of rows (11 rows total for history section)
    TOTAL_HISTORY_ROWS = 11
    for i in range(TOTAL_HISTORY_ROWS):
        if i < len(history_entries):
            yr, mo, det, flag = history_entries[i]
            if flag == "right":
                c.rect(section_left, y - row_h, year_col_w, row_h)
                c.rect(section_left + year_col_w, y - row_h, month_col_w, row_h)
                c.rect(detail_col_left, y - row_h, detail_w, row_h)
                c.setFont(font, FONT_BODY)
                c.drawRightString(section_right - 6 * mm, y - row_h + 2 * mm, det)
                y -= row_h
            else:
                y = _draw_table_row(y, yr, mo, det, center_detail=(flag is True))
        else:
            y = _draw_table_row(y)

    # ── 免許・資格 Table ──────────────────────────────────────────────
    y -= 3.5 * mm
    c.rect(section_left, y - row_h, year_col_w, row_h)
    c.rect(section_left + year_col_w, y - row_h, month_col_w, row_h)
    c.rect(detail_col_left, y - row_h, detail_w, row_h)

    if bilingual:
        c.setFont(font, 8)
        c.drawCentredString(section_left + year_col_w / 2, y - row_h + 3.6 * mm, "年")
        c.setFont(font, FONT_SMALL)
        c.drawCentredString(section_left + year_col_w / 2, y - row_h + 1.2 * mm, "Year")

        c.setFont(font, 8)
        c.drawCentredString(section_left + year_col_w + month_col_w / 2, y - row_h + 3.6 * mm, "月")
        c.setFont(font, FONT_SMALL)
        c.drawCentredString(section_left + year_col_w + month_col_w / 2, y - row_h + 1.2 * mm, "Month")

        c.setFont(font, 9)
        c.drawCentredString(detail_col_left + detail_w / 2, y - row_h + 3.6 * mm, "免　許　・　資　格")
        c.setFont(font, FONT_SMALL)
        c.drawCentredString(detail_col_left + detail_w / 2, y - row_h + 1.2 * mm, "Licenses & Qualifications")
    else:
        c.setFont(font, FONT_SECTION)
        c.drawCentredString(section_left + year_col_w / 2, y - row_h + 2 * mm, "年")
        c.drawCentredString(section_left + year_col_w + month_col_w / 2, y - row_h + 2 * mm, "月")
        c.drawCentredString(detail_col_left + detail_w / 2, y - row_h + 2 * mm, "免　許　・　資　格")

    y -= row_h

    license_entries = []
    for entry in data.get("licenses", []):
        yr = _safe_str(entry.get("year"))
        mo = _safe_str(entry.get("month"))
        detail = _safe_str(entry.get("detail"))
        era_yr = ""
        if yr:
            try:
                m = int(mo) if mo else 1
                formatted = era_converter.format_date_japanese(int(yr), m)
                era_yr = formatted.split("年")[0] + "年"
            except (ValueError, TypeError):
                era_yr = yr
        if yr or mo or detail:
            license_entries.append((era_yr, mo, detail))

    TOTAL_LICENSE_ROWS = 4
    for i in range(TOTAL_LICENSE_ROWS):
        if i < len(license_entries):
            yr, mo, det = license_entries[i]
            y = _draw_table_row(y, yr, mo, det)
        else:
            y = _draw_table_row(y)

    # ── Bottom Section (志望動機 / 通勤 / 扶養 / 希望) ───────────────
    y -= 3.5 * mm
    bottom_top = y
    bottom_bot = BOTTOM_MARGIN

    # Available vertical space
    total_bottom_h = bottom_top - bottom_bot
    if total_bottom_h < 40 * mm:
        total_bottom_h = 40 * mm
        bottom_bot = bottom_top - total_bottom_h

    # Horizontal split: 56% left, 44% right
    split_x = section_left + full_w * 0.56
    left_w = split_x - section_left
    right_w = section_right - split_x

    # ── Left Box: 志望の動機、特技など ──────────────────────────────
    c.rect(section_left, bottom_bot, left_w, total_bottom_h)
    c.setFont(font, FONT_LABEL)
    m_label = "志望の動機、特技、アピールポイント / Statement of Purpose, Skills" if bilingual else "志望の動機、特技、アピールポイントなど"
    c.drawString(section_left + 2 * mm, bottom_top - 3.5 * mm, m_label)

    # Wrapped motivation & hobbies text
    motivation = _safe_str(data.get("motivation"))
    hobbies = _safe_str(data.get("hobbies"))
    full_motivation_text = motivation
    if hobbies:
        h_title = "【趣味・特技 / Hobbies & Skills】" if bilingual else "【趣味・特技】"
        if full_motivation_text:
            full_motivation_text += f"\n\n{h_title}\n{hobbies}"
        else:
            full_motivation_text = f"{h_title}\n{hobbies}"

    text_max_w = left_w - 5 * mm
    lines = _wrap_text(full_motivation_text, font, FONT_BODY, text_max_w)
    c.setFont(font, FONT_BODY)
    line_y = bottom_top - 8 * mm
    line_spacing = FONT_BODY + 3
    for line in lines:
        if line_y < bottom_bot + 2 * mm:
            break
        c.drawString(section_left + 2.5 * mm, line_y, line)
        line_y -= line_spacing

    # ── Right Side Boxes ──────────────────────────────────────────────
    row_sh = 8.5 * mm
    ry = bottom_top

    # 1. 通勤時間
    c.rect(split_x, ry - row_sh, right_w, row_sh)
    c.setFont(font, FONT_LABEL)
    c.drawString(split_x + 2 * mm, ry - 3 * mm, "通勤時間 / Commute Time" if bilingual else "通勤時間")
    c.setFont(font, FONT_BODY)
    commute = _safe_str(data.get("commute_time"))
    c.drawCentredString(split_x + right_w / 2, ry - row_sh + 2 * mm, commute)
    ry -= row_sh

    # 2. 扶養家族数 (配偶者を除く)
    c.rect(split_x, ry - row_sh, right_w, row_sh)
    c.setFont(font, FONT_LABEL)
    c.drawString(split_x + 2 * mm, ry - 3 * mm, "扶養家族数 (配偶者除く) / Dependents" if bilingual else "扶養家族数（配偶者を除く）")
    c.setFont(font, FONT_BODY)
    dep_count = _safe_str(data.get("dependents_count", "0"))
    c.drawCentredString(split_x + right_w / 2, ry - row_sh + 2 * mm, f"{dep_count} 人" if not bilingual else f"{dep_count} 人 / Person(s)")
    ry -= row_sh

    # 3. 配偶者 & 配偶者の扶養義務 (side by side)
    half_r = right_w / 2
    c.rect(split_x, ry - row_sh, half_r, row_sh)
    c.setFont(font, FONT_LABEL)
    c.drawString(split_x + 2 * mm, ry - 3 * mm, "配偶者 / Spouse" if bilingual else "配偶者")
    c.setFont(font, FONT_BODY)
    if bilingual:
        spouse_str = "有 (Yes)" if data.get("has_spouse") else "無 (No)"
    else:
        spouse_str = "有" if data.get("has_spouse") else "無"
    c.drawCentredString(split_x + half_r / 2, ry - row_sh + 2 * mm, spouse_str)

    c.rect(split_x + half_r, ry - row_sh, half_r, row_sh)
    c.setFont(font, FONT_LABEL)
    c.drawString(split_x + half_r + 2 * mm, ry - 3 * mm, "扶養義務 / Support" if bilingual else "配偶者の扶養義務")
    c.setFont(font, FONT_BODY)
    if bilingual:
        ob_str = "有 (Yes)" if data.get("spouse_support_obligation") else "無 (No)"
    else:
        ob_str = "有" if data.get("spouse_support_obligation") else "無"
    c.drawCentredString(split_x + half_r + half_r / 2, ry - row_sh + 2 * mm, ob_str)
    ry -= row_sh

    # 4. 本人希望記入欄 (fills the remaining height down to bottom_bot)
    req_h = ry - bottom_bot
    c.rect(split_x, bottom_bot, right_w, req_h)
    c.setFont(font, FONT_LABEL)
    if bilingual:
        c.drawString(split_x + 2 * mm, ry - 3.5 * mm, "本人希望記入欄 / Preferences & Requests")
    else:
        c.drawString(split_x + 2 * mm, ry - 3.5 * mm, "本人希望記入欄")
        c.setFont(font, FONT_SMALL)
        c.drawString(split_x + 23 * mm, ry - 3.5 * mm, "(給料・職種・勤務地等の希望)")

    requests_text = _safe_str(data.get("requests"))
    if requests_text:
        c.setFont(font, FONT_BODY)
        req_lines = _wrap_text(requests_text, font, FONT_BODY, right_w - 5 * mm)
        req_y = ry - 8 * mm
        for r_line in req_lines:
            if req_y < bottom_bot + 2 * mm:
                break
            c.drawString(split_x + 2.5 * mm, req_y, r_line)
            req_y -= line_spacing
