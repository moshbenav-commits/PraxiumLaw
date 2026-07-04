# Medical LOR Workflow

**Category:** Medical Record Tracking  
**Source:** Training PI — Script Medical LOR  
**White-label:** Any firm. See [`../DISCLOSURE.md`](../DISCLOSURE.md).

---

A **Medical LOR** requests records and/or itemized bills from a provider, sent with a **HIPAA** authorization.

## Before you send

1. Read the task — confirm records/bills are **actually missing**  
2. Confirm **no duplicate request** already sent (avoid paying twice)  
3. Decide: records only, bills only, or both  
4. Set **date range** (default: date of loss → present, or specific dates of service)

## Draft

1. Generate Medical LOR for that provider  
2. Edit send method (fax/email/mail)  
3. Fill provider name on HIPAA (blank at client signing)  
4. Combine LOR + HIPAA into one PDF  
5. Staff initials on letter  

## Send and track

- Subject line pattern: `{{PROVIDER}} - {{CLIENT}} - Medical LOR`  
- Confirm send success  
- Note on task; **keep task open** until documents arrive  
- Follow up before completing  

## Product rule

One request log per provider with status `drafted | sent | received | follow-up`. Warn if a second LOR is created while the first is still open.
