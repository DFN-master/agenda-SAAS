import imaplib
import email
from email.header import decode_header
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from collections import Counter
import pickle
import os

# Ensure nltk data is downloaded
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

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

def summarize_email(body, max_sentences=3):
    sentences = nltk.sent_tokenize(body)
    if len(sentences) <= max_sentences:
        return body

    words = [w.lower() for w in nltk.word_tokenize(body) if w.isalpha()]
    if not words:
        return ' '.join(sentences[:max_sentences])

    freq = Counter(words)
    scored = []
    for sent in sentences:
        score = sum(freq.get(w.lower(), 0) for w in nltk.word_tokenize(sent) if w.isalpha())
        scored.append((score, sent))

    top = sorted(scored, key=lambda x: x[0], reverse=True)[:max_sentences]
    # Preserve original order
    top_sorted = [s for _, s in sorted(top, key=lambda x: sentences.index(x[1]))]
    return ' '.join(top_sorted)

# Classify email category
def classify_email(body):
    X = vectorizer.transform([body])
    return classifier.predict(X)[0]

# Ajuste temporário para ignorar conexão IMAP e recriar o modelo
if __name__ == "__main__":
    print("Recriando modelo de classificação...")
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
    print("Modelo recriado e salvo com sucesso.")
