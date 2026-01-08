import imaplib
import email
from email.header import decode_header
import nltk
from gensim.summarization import summarize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import os

# Ensure nltk data is downloaded
nltk.download('punkt')

# Load or train a simple email category classifier
MODEL_PATH = 'email_classifier.pkl'

if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        classifier, vectorizer = pickle.load(f)
else:
    # Dummy training data
    texts = [
        "Your invoice is attached. Please review.",
        "Meeting scheduled for tomorrow at 10 AM.",
        "Your account has been updated.",
        "Congratulations! You won a prize.",
    ]
    labels = ["billing", "meeting", "account", "promotion"]
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(texts)
    classifier = MultinomialNB()
    classifier.fit(X, labels)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump((classifier, vectorizer), f)

# Function to fetch emails from IMAP
def fetch_emails(host, port, user, password, mailbox='INBOX', limit=10):
    mail = imaplib.IMAP4_SSL(host, port)
    mail.login(user, password)
    mail.select(mailbox)
    status, messages = mail.search(None, 'ALL')
    email_ids = messages[0].split()[-limit:]
    emails = []
    for e_id in email_ids:
        status, msg_data = mail.fetch(e_id, '(RFC822)')
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                subject, encoding = decode_header(msg['Subject'])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding if encoding else 'utf-8')
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body += part.get_payload(decode=True).decode()
                else:
                    body = msg.get_payload(decode=True).decode()
                emails.append({'subject': subject, 'body': body})
    return emails

# Summarize email body
def summarize_email(body, ratio=0.2):
    try:
        return summarize(body, ratio=ratio)
    except ValueError:
        # If text is too short for summarization
        return body

# Classify email category
def classify_email(body):
    X = vectorizer.transform([body])
    return classifier.predict(X)[0]

# Example usage
if __name__ == "__main__":
    HOST = os.getenv('IMAP_HOST', 'imap.example.com')
    PORT = int(os.getenv('IMAP_PORT', 993))
    USER = os.getenv('IMAP_USER', 'user@example.com')
    PASS = os.getenv('IMAP_PASS', 'password')

    emails = fetch_emails(HOST, PORT, USER, PASS)
    for e in emails:
        summary = summarize_email(e['body'])
        category = classify_email(e['body'])
        print(f"Subject: {e['subject']}")
        print(f"Category: {category}")
        print(f"Summary: {summary}\n")
