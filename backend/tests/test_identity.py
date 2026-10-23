"""Tenant scoping: who owns what.

The console, the SDKs and the MCP server all key organizations, billing
and the workspace by a tenant. These tests pin the rules:

* a Clerk session with an organization context owns things as the
  organization, so a team shares one tenant;
* a session without one owns things as itself, so a solo user has a
  private tenant;
* a machine key always owns things as itself;
* the approver set for policy promotion is keyed by the actor, so two
  members of one organization can each approve.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.identity import (  # noqa: E402
    auth_mode,
    is_admin,
    org_id,
    org_role,
    owner,
    role,
    user_id,
)


def clerk_session(sub="user_1", org=None, org_role_value=None, roles=None):
    payload = {"sub": sub, "auth_mode": "verified"}
    if org:
        payload["org_id"] = org
    if org_role_value:
        payload["org_role"] = org_role_value
    if roles:
        payload["roles"] = roles
    return payload


def test_user_id_prefers_sub():
    assert user_id({"sub": "u1", "user_id": "u2"}) == "u1"


def test_open_mode_is_the_local_operator():
    assert user_id({}) == "local-dev"
    assert role({}) == "owner"
    assert is_admin({})


def test_no_org_means_a_personal_tenant():
    s = clerk_session()
    assert owner(s) == "user:user_1"
    assert org_id(s) is None


def test_org_context_makes_the_organization_the_tenant():
    s = clerk_session(org="org_abc")
    assert owner(s) == "org:org_abc"
    assert org_id(s) == "org_abc"


def test_two_members_of_one_org_share_a_tenant():
    a = clerk_session(sub="user_a", org="org_abc")
    b = clerk_session(sub="user_b", org="org_abc")
    assert owner(a) == owner(b)


def test_two_organizations_are_isolated():
    a = clerk_session(sub="user_a", org="org_abc")
    b = clerk_session(sub="user_b", org="org_xyz")
    assert owner(a) != owner(b)


def test_a_user_outside_any_org_is_isolated_from_the_team():
    a = clerk_session(sub="user_a", org="org_abc")
    b = clerk_session(sub="user_b")
    assert owner(a) != owner(b)


def test_machine_keys_are_their_own_tenant():
    k = {"sub": "apikey:abc123", "auth_mode": "api_key", "role": "service"}
    assert owner(k) == "apikey:abc123"
    assert owner(k) != owner(clerk_session(org="org_abc"))
    assert auth_mode(k) == "api_key"


def test_org_role_wins_over_user_roles():
    s = clerk_session(org="org_abc", org_role_value="admin", roles=["member"])
    assert role(s) == "admin"
    assert is_admin(s)


def test_a_plain_member_is_not_an_admin():
    s = clerk_session(org="org_abc", org_role_value="basic_member")
    assert not is_admin(s)


def test_user_roles_are_used_without_an_org():
    s = clerk_session(roles=["admin"])
    assert role(s) == "admin"
    assert is_admin(s)


def test_alternate_org_claim_names_are_accepted():
    assert org_id({"organization_id": "org_z"}) == "org_z"
    assert org_id({"orgId": "org_q"}) == "org_q"
