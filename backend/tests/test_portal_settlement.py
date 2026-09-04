"""
Client-portal settlement page gate (portal_settlement.py).

The page exists only when the matter's settlement is client-facing ready — an
attorney-approved scenario with no medical line still awaiting a reduction
decision. These tests pin that gate on the pure view function; the route itself
is a thin wrapper over the portal token dependency (get_current_portal_client),
which already 401s anonymous callers and 403s matters outside the portal.
"""
from __future__ import annotations

from portal_settlement import DEFAULT_CAPTION, celebration_from_firm, pick_client_scenario, portal_settlement_view


def _scenario(**over):
    base = {
        "id": "s1",
        "name": "Policy limits",
        "gross_settlement": 100_000,
        "expenses": 2_000,
        "attorney_fee_pct": 33.333,
        "line_items": [{"balance": 10_000, "reduction_type": "percent", "reduction_percent": 20}],
        "attorney_approved": True,
        "attorney_approved_at": "2026-09-01T00:00:00Z",
    }
    base.update(over)
    return base


def _matter(scenarios, active=None):
    return {
        "id": "m1",
        "title": "Doe v. Insurer",
        "case_number": "GMI-0001",
        "pi_settlement": {"offers": [], "scenarios": scenarios, "active_scenario_id": active},
    }


FIRM = {"name": "Gold Medal Injury", "settings": {"settlement_celebration": {"image_url": "/brand/gmi/settlement.webp", "caption": "We get you the gold."}}}


def test_no_settlement_data_is_not_ready():
    assert portal_settlement_view({"id": "m1"}, FIRM) == {"ready": False}
    assert portal_settlement_view(None, FIRM) == {"ready": False}


def test_unapproved_scenario_is_not_ready():
    view = portal_settlement_view(_matter([_scenario(attorney_approved=False)]), FIRM)
    assert view == {"ready": False}


def test_pending_reduction_blocks_even_when_approved():
    s = _scenario(line_items=[{"balance": 5_000, "reduction_type": "none"}])
    assert portal_settlement_view(_matter([s], active="s1"), FIRM) == {"ready": False}


def test_ready_view_carries_summary_and_firm_celebration():
    view = portal_settlement_view(_matter([_scenario()], active="s1"), FIRM)
    assert view["ready"] is True
    assert view["celebration"]["image_url"] == "/brand/gmi/settlement.webp"
    assert view["celebration"]["caption"] == "We get you the gold."
    assert view["firm"]["name"] == "Gold Medal Injury"
    assert view["matter"]["case_number"] == "GMI-0001"
    s = view["summary"]
    assert s["gross_settlement"] == 100_000
    assert s["medical_payout"] == 8_000  # 10k balance reduced 20%
    assert s["medical_reductions"] == 2_000
    assert round(s["attorney_fee"]) == 33_333
    assert s["net_to_client"] == round(100_000 - s["attorney_fee"] - 2_000 - 8_000, 2)


def test_active_scenario_wins_else_latest_approved():
    older = _scenario(id="old", attorney_approved_at="2026-08-01T00:00:00Z", gross_settlement=50_000)
    newer = _scenario(id="new", attorney_approved_at="2026-09-01T00:00:00Z", gross_settlement=90_000)
    assert pick_client_scenario({"scenarios": [older, newer], "active_scenario_id": "old"})["id"] == "old"
    assert pick_client_scenario({"scenarios": [older, newer], "active_scenario_id": None})["id"] == "new"
    # an active scenario that is NOT ready never leaks — the ready one shows instead
    unready_active = _scenario(id="draft", attorney_approved=False)
    assert pick_client_scenario({"scenarios": [older, unready_active], "active_scenario_id": "draft"})["id"] == "old"


def test_celebration_defaults_when_firm_has_none():
    assert celebration_from_firm(None) == {"caption": DEFAULT_CAPTION}
    assert celebration_from_firm({"settings": {}}) == {"caption": DEFAULT_CAPTION}
    # unknown keys are dropped; empties are dropped
    c = celebration_from_firm({"settings": {"settlement_celebration": {"image_url": "", "note": "x", "junk": 1}}})
    assert c == {"note": "x", "caption": DEFAULT_CAPTION}
