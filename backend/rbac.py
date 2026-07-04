"""
Praxium Suite — firm RBAC (saas-rbac pattern).
Roles: admin · partner · attorney · paralegal · staff · billing
"""
from __future__ import annotations

from typing import Callable, Optional, Set

from fastapi import Depends, HTTPException

ROLES = ("admin", "partner", "attorney", "paralegal", "staff", "billing")

# Permission → roles allowed
PERMISSIONS: dict[str, Set[str]] = {
    "matters.read": {"admin", "partner", "attorney", "paralegal", "staff", "billing"},
    "matters.write": {"admin", "partner", "attorney", "paralegal"},
    "contacts.read": {"admin", "partner", "attorney", "paralegal", "staff", "billing"},
    "contacts.write": {"admin", "partner", "attorney", "paralegal", "staff"},
    "documents.read": {"admin", "partner", "attorney", "paralegal", "staff"},
    "documents.write": {"admin", "partner", "attorney", "paralegal", "staff"},
    "tasks.read": {"admin", "partner", "attorney", "paralegal", "staff"},
    "tasks.write": {"admin", "partner", "attorney", "paralegal", "staff"},
    "leads.read": {"admin", "partner", "attorney", "paralegal"},
    "leads.write": {"admin", "partner", "attorney"},
    "team.read": {"admin", "partner", "attorney", "paralegal", "staff", "billing"},
    "team.manage": {"admin", "partner"},
    "billing.read": {"admin", "partner", "billing"},
    "billing.write": {"admin"},
    "workflows.read": {"admin", "partner", "attorney"},
    "workflows.manage": {"admin", "partner"},
    "audit.read": {"admin", "partner"},
    "marketplace.manage": {"admin", "partner"},
    "settings.write": {"admin", "partner"},
    "idv.review": {"admin", "partner", "attorney", "paralegal"},
    "integrations.read": {"admin", "partner", "attorney"},
    "integrations.manage": {"admin", "partner"},
    "demand.read": {"admin", "partner", "attorney", "paralegal", "staff"},
    "demand.draft": {"admin", "partner", "attorney", "paralegal", "staff"},
    "demand.approve": {"admin", "partner", "attorney"},
    "demand.send": {"admin", "partner", "attorney"},
    "settlement.read": {"admin", "partner", "attorney", "paralegal", "staff", "billing"},
    "settlement.draft": {"admin", "partner", "attorney", "paralegal", "staff"},
    "settlement.approve": {"admin", "partner", "attorney"},
}


def role_has_permission(role: str, permission: str) -> bool:
    allowed = PERMISSIONS.get(permission, set())
    return role in allowed


def require_permission(permission: str, get_current_user: Callable):
    """FastAPI dependency factory — 403 when role lacks permission."""

    async def _guard(user=Depends(get_current_user)):
        role = user.get("role", "staff")
        if not role_has_permission(role, permission):
            raise HTTPException(403, f"Role '{role}' cannot {permission}")
        return user

    return _guard


def require_roles(*roles: str, get_current_user: Callable):
    allowed = set(roles)

    async def _guard(user=Depends(get_current_user)):
        if user.get("role", "staff") not in allowed:
            raise HTTPException(403, "Insufficient role")
        return user

    return _guard
