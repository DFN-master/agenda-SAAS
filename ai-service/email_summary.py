import imaplib
import email
from email.header import decode_header
import openai

# Set OpenAI API key
openai.api_key = "your_openai_api_key"

def connect_to_email():
    mail = imaplib.IMAP4_SSL("imap.your-email-provider.com")
    mail.login("your-email@example.com", "your-password")
    return mail

def fetch_emails(mail):
    mail.select("inbox")
    status, messages = mail.search(None, "ALL")
    email_ids = messages[0].split()
    emails = []

    for email_id in email_ids[-10:]:  # Fetch last 10 emails
        res, msg = mail.fetch(email_id, "(RFC822)")
        for response in msg:
            if isinstance(response, tuple):
                msg = email.message_from_bytes(response[1])
                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding if encoding else "utf-8")
                emails.append(subject)
    return emails

def generate_summary(emails):
    prompt = "Summarize the following emails:\n" + "\n".join(emails)
    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=150
    )
    return response["choices"][0]["text"].strip()

def main():
    mail = connect_to_email()
    emails = fetch_emails(mail)
    summary = generate_summary(emails)
    print("Email Summary:", summary)

if __name__ == "__main__":
    main()