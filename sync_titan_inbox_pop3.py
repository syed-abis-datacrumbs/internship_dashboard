import poplib
import email
from email.header import decode_header
import requests
import os

POP3_SERVER = "pop.titan.email"
POP3_PORT = 995

TITAN_EMAIL = os.getenv("TITAN_EMAIL", "careers@datacrumbs.org")
TITAN_PASSWORD = os.getenv("TITAN_PASSWORD", "Leanwaste@01")

def sync_pop3():
    webhook_url = os.getenv("DASHBOARD_WEBHOOK_URL", "http://localhost:3000/api/webhooks/resend-inbound")
    print(f"Connecting via POP3 to Titan Email ({POP3_SERVER}:{POP3_PORT}) for {TITAN_EMAIL}...")
    try:
        pop = poplib.POP3_SSL(POP3_SERVER, POP3_PORT)
        pop.user(TITAN_EMAIL)
        pop.pass_(TITAN_PASSWORD)
        
        num_messages, total_size = pop.stat()
        print(f"Logged in successfully! Total messages in Titan inbox: {num_messages}")

        synced_count = 0
        # Iterate over recent 100 messages
        for i in range(num_messages, max(0, num_messages - 100), -1):
            try:
                response, lines, octets = pop.retr(i)
                raw_email = b"\r\n".join(lines)
                msg = email.message_from_bytes(raw_email)

                # Extract subject
                subject = msg["Subject"]
                if subject:
                    subject_header = decode_header(subject)[0]
                    if isinstance(subject_header[0], bytes):
                        subject = subject_header[0].decode(subject_header[1] or "utf-8", errors="ignore")

                # Extract sender
                sender = msg.get("From")
                sender_email = email.utils.parseaddr(sender)[1]

                # Extract body
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))
                        if content_type == "text/plain" and "attachment" not in content_disposition:
                            try:
                                body = part.get_payload(decode=True).decode(errors="ignore")
                                break
                            except Exception:
                                pass
                else:
                    try:
                        body = msg.get_payload(decode=True).decode(errors="ignore")
                    except Exception:
                        pass

                if sender_email and body and len(body.strip()) > 5:
                    try:
                        res = requests.post(
                            webhook_url,
                            json={"from": sender_email, "text": body, "subject": subject},
                            headers={"Content-Type": "application/json"}
                        )
                        if res.status_code == 200:
                            synced_count += 1
                            print(f"[{synced_count}] Synced email from: {sender_email}")
                    except Exception as e:
                        print(f"Error posting email from {sender_email}: {e}")
            except Exception as e:
                print(f"Error reading message {i}: {e}")

        pop.quit()
        print(f"\nCompleted POP3 Inbox Sync! Synced {synced_count} emails into Dashboard & OpenAI analysis.")

    except Exception as e:
        print(f"POP3 Error: {e}")

if __name__ == "__main__":
    sync_pop3()
