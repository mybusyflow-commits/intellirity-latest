"""Outbound mail for the public contact form.

Two transports, both optional and both dependency-free:

  Resend   RESEND_API_KEY + EMAIL_FROM + CONTACT_INBOX
  SMTP     SMTP_HOST + SMTP_PORT (+ SMTP_USER/SMTP_PASSWORD, STARTTLS) + EMAIL_FROM + CONTACT_INBOX

Design rules:

* Persisting the submission is the caller's job and happens first. This
  module only delivers a notification; a mail failure never loses a lead.
* `reply_to` is the submitter, so hitting reply answers the person who
  wrote in. The subject carries the ticket id, so a thread is traceable
  back to the database row.
* Nothing here raises. Every failure is returned as (False, reason) and
  logged, because a 500 on a public form is a worse outcome than a
  delayed notification.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr, formatdate
from html import escape

log = logging.getLogger("intellirity.notify")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def contact_inbox() -> str:
    return _env("CONTACT_INBOX", "security@intellirity.com")


def email_from() -> str:
    return _env("EMAIL_FROM", "Intellirity <noreply@intellirity.com>")


def transport() -> str:
    """Which transport is configured, if any."""
    if _env("RESEND_API_KEY"):
        return "resend"
    if _env("SMTP_HOST"):
        return "smtp"
    return ""


def notification_configured() -> bool:
    return transport() != ""


def _subject(submission: dict) -> str:
    ticket = submission.get("ticket", "")
    topic = (submission.get("subject") or "Contact").strip()[:120]
    who = (submission.get("name") or submission.get("email") or "unknown").strip()[:80]
    return f"[Intellirity] {ticket} · {topic} · {who}"


def _text_body(submission: dict) -> str:
    return (
        f"Ticket:  {submission.get('ticket', '')}\n"
        f"Name:    {submission.get('name', '')}\n"
        f"Email:   {submission.get('email', '')}\n"
        f"Subject: {submission.get('subject', '')}\n"
        f"Source:  {submission.get('source', 'landing')}\n"
        f"IP:      {submission.get('client_ip', '')}\n"
        f"UA:      {submission.get('user_agent', '')}\n"
        f"Sent:    {submission.get('created_at', '')}\n"
        "\n"
        f"{submission.get('message', '')}\n"
    )


def _html_body(submission: dict) -> str:
    rows = [
        ("Ticket", submission.get("ticket", "")),
        ("Name", submission.get("name", "")),
        ("Email", submission.get("email", "")),
        ("Subject", submission.get("subject", "")),
        ("Source", submission.get("source", "landing")),
        ("IP", submission.get("client_ip", "")),
        ("Sent", submission.get("created_at", "")),
    ]
    cells = "".join(
        f'<tr><td style="padding:4px 12px 4px 0;color:#666">{escape(str(k))}</td>'
        f'<td style="padding:4px 0">{escape(str(v))}</td></tr>'
        for k, v in rows
    )
    body = escape(str(submission.get("message", ""))).replace("\n", "<br>")
    return (
        '<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.55">'
        f"<table>{cells}</table>"
        f'<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">'
        f"<p style=\"white-space:pre-wrap\">{body}</p>"
        "</div>"
    )


async def _send_resend(submission: dict) -> tuple[bool, str]:
    payload = {
        "from": email_from(),
        "to": [contact_inbox()],
        "reply_to": submission.get("email", ""),
        "subject": _subject(submission),
        "text": _text_body(submission),
        "html": _html_body(submission),
    }
    data = json.dumps(payload).encode()

    def _post() -> tuple[bool, str]:
        req = urllib.request.Request(
            RESEND_ENDPOINT,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {_env('RESEND_API_KEY')}",
                "Content-Type": "application/json",
                "User-Agent": "intellirity-contact/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if 200 <= resp.status < 300:
                    return True, "resent"
                return False, f"resend status {resp.status}"
        except Exception as exc:  # URLError, HTTPError, timeout
            return False, f"resend failed: {exc}"

    return await asyncio.to_thread(_post)


async def _send_smtp(submission: dict) -> tuple[bool, str]:
    host = _env("SMTP_HOST")
    port = int(_env("SMTP_PORT", "587"))
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD")

    msg = EmailMessage()
    msg["From"] = email_from()
    msg["To"] = contact_inbox()
    msg["Subject"] = _subject(submission)
    msg["Date"] = formatdate(localtime=False)
    if submission.get("email"):
        msg["Reply-To"] = formataddr(
            (submission.get("name") or "", submission["email"])
        )
    msg.set_content(_text_body(submission))
    msg.add_alternative(_html_body(submission), subtype="html")

    def _deliver() -> tuple[bool, str]:
        try:
            context = ssl.create_default_context()
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as s:
                    if user:
                        s.login(user, password)
                    s.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=20) as s:
                    s.ehlo()
                    if _env("SMTP_STARTTLS", "true").lower() in ("1", "true", "yes"):
                        s.starttls(context=context)
                        s.ehlo()
                    if user:
                        s.login(user, password)
                    s.send_message(msg)
            return True, "smtp"
        except Exception as exc:
            return False, f"smtp failed: {exc}"

    return await asyncio.to_thread(_deliver)


async def send_contact_email(submission: dict) -> tuple[bool, str]:
    """Deliver the notification. Returns (delivered, transport_or_reason)."""
    kind = transport()
    if not kind:
        log.warning(
            "contact notification not configured: set RESEND_API_KEY or SMTP_HOST "
            "(submission %s is persisted only)",
            submission.get("ticket", "?"),
        )
        return False, "not configured"
    try:
        if kind == "resend":
            ok, detail = await _send_resend(submission)
        else:
            ok, detail = await _send_smtp(submission)
    except Exception as exc:
        log.warning("contact notification crashed: %s", str(exc)[:160])
        return False, "transport error"
    if not ok:
        log.warning("contact notification failed (%s): %s", submission.get("ticket"), detail)
    return ok, detail
