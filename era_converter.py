"""
Japanese era (和暦) ↔ Western year (西暦) converter.

Supports: 明治 (Meiji), 大正 (Taisho), 昭和 (Showa), 平成 (Heisei), 令和 (Reiwa).
"""

from datetime import date
from typing import Optional

# Each era: (name_kanji, name_romaji, start_date, end_date_or_none)
ERAS = [
    ("令和", "Reiwa", date(2019, 5, 1), None),
    ("平成", "Heisei", date(1989, 1, 8), date(2019, 4, 30)),
    ("昭和", "Showa", date(1926, 12, 25), date(1989, 1, 7)),
    ("大正", "Taisho", date(1912, 7, 30), date(1926, 12, 24)),
    ("明治", "Meiji", date(1868, 1, 25), date(1912, 7, 29)),
]


def western_to_era(year: int, month: int = 1, day: int = 1) -> tuple[str, int]:
    """
    Convert a Western calendar date to Japanese era.

    Args:
        year: Western year (e.g. 1990)
        month: Month (1-12), defaults to 1
        day: Day (1-31), defaults to 1

    Returns:
        Tuple of (era_name_kanji, era_year).
        e.g. (1990, 1, 8) -> ("平成", 2)

    Raises:
        ValueError: If the date is before the Meiji era.
    """
    target = date(year, month, day)

    for era_name, _, start, end in ERAS:
        if target >= start:
            era_year = year - start.year + 1
            return (era_name, era_year)

    raise ValueError(f"Year {year} is before the Meiji era (1868)")


def era_to_western(era_name: str, era_year: int) -> int:
    """
    Convert a Japanese era year to Western year.

    Args:
        era_name: Era name in kanji (e.g. "平成")
        era_year: Year within the era (e.g. 2 for 平成2年)

    Returns:
        Western year (e.g. 1990)

    Raises:
        ValueError: If the era name is not recognized.
    """
    for name, _, start, _ in ERAS:
        if name == era_name:
            return start.year + era_year - 1

    raise ValueError(f"Unknown era: {era_name}")


def format_date_japanese(year: int, month: int) -> str:
    """
    Format a year/month as Japanese era string.

    Args:
        year: Western year
        month: Month (1-12)

    Returns:
        Formatted string like "令和3年4月" or "平成2年1月".
        Year 1 of an era uses "元" (gan) instead of "1".
    """
    try:
        era_name, era_year = western_to_era(year, month)
        year_str = "元" if era_year == 1 else str(era_year)
        return f"{era_name}{year_str}年{month}月"
    except ValueError:
        return f"{year}年{month}月"


def calculate_age(birth_date_str: str, reference_date: Optional[date] = None) -> int:
    """
    Calculate age from a birth date string (YYYY-MM-DD format).

    Args:
        birth_date_str: Date string in YYYY-MM-DD format.
        reference_date: Date to calculate age at. Defaults to today.

    Returns:
        Age in years.
    """
    birth = date.fromisoformat(birth_date_str)
    ref = reference_date or date.today()
    age = ref.year - birth.year
    if (ref.month, ref.day) < (birth.month, birth.day):
        age -= 1
    return age


def get_era_choices() -> list[dict]:
    """
    Get list of era choices for a dropdown/select UI element.

    Returns:
        List of dicts with 'name', 'romaji', 'start_year', 'end_year' keys.
    """
    choices = []
    for name, romaji, start, end in ERAS:
        choices.append({
            "name": name,
            "romaji": romaji,
            "start_year": start.year,
            "end_year": end.year if end else None,
        })
    return choices
