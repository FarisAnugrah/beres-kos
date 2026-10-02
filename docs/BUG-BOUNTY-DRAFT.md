# Bug Bounty Report Draft (Meta/Facebook Whitehat)

**Title:** Privacy Issue: Real Phone Number Leaks in Raw Web Payload Bypassing Multi-Device `@lid` Anonymization

**Vulnerability Type:** Privacy / Data Exposure
**Product:** WhatsApp Web

### Description:
When a user sends a message using a linked multi-device, WhatsApp masks their real phone number by assigning a Local ID (`@lid` format, e.g., `8600675...`). This is intended to preserve user privacy and abstract the real phone number across the network. 

However, I discovered that the real phone number (e.g., `6289...`) is still leaking in the raw background payload object (`msg._data.author` or `msg._data.notifyName`) that is sent to the recipient's WhatsApp Web client.

By intercepting and extracting the raw message payload, a malicious client or unofficial wrapper can easily bypass the `@lid` privacy mechanism and extract the user's real phone number without their explicit consent.

### Impact:
This completely undermines the privacy abstraction provided by the `@lid` feature. Malicious actors or automated bots can harvest real phone numbers of users who interact with them, even when WhatsApp intentionally masks their identity at the UI level.

### Steps to Reproduce:
1. Setup a WhatsApp Web client and intercept the incoming WebSocket traffic (or use an automation wrapper like Puppeteer to log the raw message object).
2. Have a user send a message using a linked multi-device.
3. Observe that the `from` property is correctly masked as `86006753665190@lid`.
4. Inspect the raw underlying payload (e.g., `_data` object).
5. Notice that the real, unmasked phone number is exposed in the `author` string (e.g., `6289531649707@c.us`).

### Suggested Mitigation:
The backend should strip or sanitize the real phone number from all fields (including `author` and `notifyName` inside the payload) and exclusively use the `@lid` abstraction before delivering the packet to the recipient's Web client.