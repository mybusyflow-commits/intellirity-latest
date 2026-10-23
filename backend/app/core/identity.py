"""Identity derivation for every authenticated request.

A request can carry two kinds of identity:

  1. A Clerk **session** — a human. The JWT carries `sub` (user id) and,
     when the user has an active organization context, `org_id` + `org_role`.
  2. An **API key** — a machine. It gets a stable service identity.

Ownership rules
---------------
* A user inside an organization owns things as the **organization**, so a
  team shares one tenant (one billing account, one workspace, one ledger).
* A user with no organization context owns things as **themselves**, so a
  solo user still gets their own private tenant.
* A machine key always owns things as itself.

That single `owner` string is what organizations, billing, entitlements and
the workspace are keyed by — so switching identity providers later only
means changing this file.
"""
from typing import Optional

from app.core.security import require_user  # re-exported for convenience


def _claims(user: Optional[dict]) -> dict:
    return user if isinstance(user, dict) else {}


def user_id(user: Optional[dict]) -> str:
    """The subject of the request: a Clerk user id, or a machine key id."""
    c = _claims(user)
    return str(c.get("sub") or c.get("user_id") or "local-dev")


def org_id(user: Optional[dict]) -> Optional[str]:
    """The active Clerk organization id, if the session has one."""
    c = _claims(user)
    for key in ("org_id", "organization_id", "orgId"):
        val = c.get(key)
        if val:
            return str(val)
    return None


def org_role(user: Optional[dict]) -> Optional[str]:
    c = _claims(user)
    for key in ("org_role", "organization_role"):
        val = c.get(key)
        if val:
            return str(val)
    return None


def owner(user: Optional[dict]) -> str:
    """The tenant key for everything this request reads or writes.

    Organization context wins so a team shares one tenant. Without it, the
    user owns a personal tenant.
    """
    c = _claims(user)
    if c.get("auth_mode") == "api_key":
        return user_id(c)
    org = org_id(c)
    if org:
        return f"org:{org}"
    return f"user:{user_id(c)}"


def role(user: Optional[dict]) -> str:
    """Effective role: organization role when present, else the user's own."""
    c = _claims(user)
    if not c:
        # Open mode (no auth configured): the local operator is the owner.
        return "owner"
    r = org_role(c)
    if r:
        return r
    roles = c.get("roles") or c.get("role")
    if isinstance(roles, list) and roles:
        return str(roles[0])
    if isinstance(roles, str) and roles:
        return roles
    return "member"


def is_admin(user: Optional[dict]) -> bool:
    return role(user).lower() in ("admin", "owner", "org:admin", "org:owner")

def auth_mode(user: Optional[dict]) -> str:
    return str(_claims(user).get("auth_mode") or ("open" if not user else "verified"))
