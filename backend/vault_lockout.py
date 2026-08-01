"""
Praxium Suite — partner vault escalating-lockout state machine.

Python port of packages/creytix-vault-crypto/src/lockout.mjs (same repo,
Expedia Solutions monorepo) — same constants, same semantics, ported here
because this is where it actually needs to run: server-side, in the
FastAPI backend that owns the authKey verifier and the per-scope lockout
state in Mongo. The JS version is the tested reference design; this is
the runtime implementation.

Ricardo, 2026-08-01, confirmed directly: the vault should never destroy
data on a failed unlock attempt, only keep it locked. This module has no
destruction path anywhere — see docs/creytix/CREYTIX_RICARDO_DECISION_
DASHBOARD_PLAN_2026-08-01.md §22c/§22e-résolu for the full reasoning
(destroy-on-N-attempts protects against no attacker the lockout ladder
doesn't already stop, while making Sean's own typo the likeliest cause of
permanent data loss on real financial records).

Pure functions — no db/clock access. partner_vault.py owns persisting
VaultLockoutState per scope and passing in the real clock (time.time()),
which is what makes this fully unit-testable without a database.
"""
from __future__ import annotations

from typing import Optional, TypedDict

FREE_ATTEMPTS = 3
DELAY_LADDER_SECONDS = [
    5 * 60,  # attempt 4
    30 * 60,  # attempt 5
    2 * 60 * 60,  # attempt 6
    24 * 60 * 60,  # attempt 7+ (cap)
]
FREEZE_AT_ATTEMPTS = 10


class LockoutState(TypedDict):
    failure_count: int
    last_failure_at: Optional[float]
    frozen: bool


def fresh_lockout_state() -> LockoutState:
    return {"failure_count": 0, "last_failure_at": None, "frozen": False}


def check_unlock_allowed(state: LockoutState, now: float) -> dict:
    """
    @returns {"allowed": bool, "reason": "frozen"|"lockout"|None, "retry_after": float|None}
    """
    if state["frozen"]:
        return {"allowed": False, "reason": "frozen", "retry_after": None}
    if state["failure_count"] < FREE_ATTEMPTS:
        return {"allowed": True, "reason": None, "retry_after": None}
    ladder_index = min(state["failure_count"] - FREE_ATTEMPTS, len(DELAY_LADDER_SECONDS) - 1)
    delay = DELAY_LADDER_SECONDS[ladder_index]
    retry_after = (state["last_failure_at"] or 0) + delay
    if now < retry_after:
        return {"allowed": False, "reason": "lockout", "retry_after": retry_after}
    return {"allowed": True, "reason": None, "retry_after": None}


def record_failure(state: LockoutState, now: float, *, via_recovery_key: bool = False) -> LockoutState:
    """
    A Recovery-Key unlock bypasses the ladder entirely (dashboard plan
    §22d.4, "Tradeoffs iii") — it's 128 bits of entropy, rate-limiting it
    protects nothing and would just slow down someone who already has the
    physical recovery kit in hand for no security benefit.
    """
    if via_recovery_key:
        return state
    failure_count = state["failure_count"] + 1
    frozen = state["frozen"] or failure_count >= FREEZE_AT_ATTEMPTS
    return {"failure_count": failure_count, "last_failure_at": now, "frozen": frozen}


def record_success(state: LockoutState, *, via_recovery_key: bool = False) -> LockoutState:
    """
    A successful passphrase unlock resets the ladder. A Recovery-Key
    unlock does NOT clear a freeze — freeze exists specifically to force
    an out-of-band re-verification step (dashboard plan §22d.3), and a
    lost/stolen recovery kit successfully unlocking data is exactly the
    scenario freeze exists to catch, not bypass.
    """
    if via_recovery_key:
        return state
    return fresh_lockout_state()
