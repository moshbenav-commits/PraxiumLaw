"""Pure state-machine tests — no DB, no FastAPI. See partner_vault.py for the wiring."""
import pytest

from vault_lockout import (
    FREE_ATTEMPTS,
    FREEZE_AT_ATTEMPTS,
    DELAY_LADDER_SECONDS,
    fresh_lockout_state,
    check_unlock_allowed,
    record_failure,
    record_success,
)

T0 = 1_800_000_000.0


def test_allows_free_attempts_with_no_delay():
    state = fresh_lockout_state()
    for i in range(FREE_ATTEMPTS):
        assert check_unlock_allowed(state, T0)["allowed"] is True
        state = record_failure(state, T0 + i)


def test_locks_out_after_free_attempts_exhausted():
    state = fresh_lockout_state()
    for _ in range(FREE_ATTEMPTS):
        state = record_failure(state, T0)
    check = check_unlock_allowed(state, T0 + 1)
    assert check["allowed"] is False
    assert check["reason"] == "lockout"
    assert check["retry_after"] == T0 + DELAY_LADDER_SECONDS[0]


def test_allows_again_once_ladder_delay_elapsed():
    state = fresh_lockout_state()
    for _ in range(FREE_ATTEMPTS):
        state = record_failure(state, T0)
    after = T0 + DELAY_LADDER_SECONDS[0] + 1
    assert check_unlock_allowed(state, after)["allowed"] is True


def test_escalates_through_the_ladder():
    state = fresh_lockout_state()
    for _ in range(FREE_ATTEMPTS + 1):  # 4th failure -> ladder index 1
        state = record_failure(state, T0)
    check = check_unlock_allowed(state, T0 + 1)
    assert check["retry_after"] == T0 + DELAY_LADDER_SECONDS[1]


def test_freezes_at_freeze_threshold_not_an_ever_growing_delay():
    state = fresh_lockout_state()
    for _ in range(20):
        state = record_failure(state, T0)
    assert state["frozen"] is True
    check = check_unlock_allowed(state, T0 + 1)
    assert check["reason"] == "frozen"


def test_freeze_stays_locked_regardless_of_elapsed_time():
    state = fresh_lockout_state()
    for _ in range(FREEZE_AT_ATTEMPTS):
        state = record_failure(state, T0)
    assert state["frozen"] is True
    check = check_unlock_allowed(state, T0 + 365 * 24 * 60 * 60)
    assert check["allowed"] is False
    assert check["reason"] == "frozen"


def test_success_resets_the_ladder():
    state = fresh_lockout_state()
    state = record_failure(state, T0)
    state = record_failure(state, T0)
    state = record_success(state)
    assert state == fresh_lockout_state()


def test_recovery_key_failures_never_advance_the_ladder():
    state = fresh_lockout_state()
    state = record_failure(state, T0, via_recovery_key=True)
    assert state == fresh_lockout_state()


def test_recovery_key_success_does_not_clear_an_existing_freeze():
    state = fresh_lockout_state()
    for _ in range(FREEZE_AT_ATTEMPTS):
        state = record_failure(state, T0)
    assert state["frozen"] is True
    after = record_success(state, via_recovery_key=True)
    assert after["frozen"] is True


def test_passphrase_success_does_clear_an_existing_freeze():
    state = fresh_lockout_state()
    for _ in range(FREEZE_AT_ATTEMPTS):
        state = record_failure(state, T0)
    after = record_success(state)
    assert after["frozen"] is False
