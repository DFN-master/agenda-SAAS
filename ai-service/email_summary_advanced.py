import imaplib
import email
from email.header import decode_header
import os
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle

# Ensure nltk data is downloaded
nltk.download('punkt')

# Paths for saving the model
MODEL_PATH = 'advanced_email_classifier.pkl'

# Training data (can be expanded with real data)
training_data = [
    {"subject": "Invoice attached", "body": "Please find the invoice attached.", "label": "billing"},
    {"subject": "Meeting tomorrow", "body": "The meeting is scheduled for tomorrow at 10 AM.", "label": "meeting"},
    {"subject": "Account updated", "body": "Your account details have been updated.", "label": "account"},
    {"subject": "Congratulations!", "body": "You have won a prize!", "label": "promotion"},
]

# Load or train the model
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
else:
    # Prepare training data
    texts = [f"{data['subject']} {data['body']}" for data in training_data]
    labels = [data['label'] for data in training_data]

    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)

    # Create a pipeline with TF-IDF and Naive Bayes
    model = Pipeline([
        ('tfidf', TfidfVectorizer()),
        ('classifier', MultinomialNB()),
    ])

    # Train the model
    model.fit(X_train, y_train)

    # Evaluate the model
    y_pred = model.predict(X_test)
    print("Classification Report:\n", classification_report(y_test, y_pred))

    # Save the model
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

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

# Classify email and provide feedback for learning
def classify_and_learn(email_data, feedback=None):
    text = f"{email_data['subject']} {email_data['body']}"
    prediction = model.predict([text])[0]

    if feedback and feedback != prediction:
        print(f"Updating model with corrected label: {feedback}")
        # Update the model with new data
        global training_data
        training_data.append({"subject": email_data['subject'], "body": email_data['body'], "label": feedback})
        texts = [f"{data['subject']} {data['body']}" for data in training_data]
        labels = [data['label'] for data in training_data]
        model.fit(texts, labels)
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(model, f)

    return prediction

# Example usage
if __name__ == "__main__":
    HOST = os.getenv('IMAP_HOST', 'imap.example.com')
    PORT = int(os.getenv('IMAP_PORT', 993))
    USER = os.getenv('IMAP_USER', 'user@example.com')
    PASS = os.getenv('IMAP_PASS', 'password')

    emails = fetch_emails(HOST, PORT, USER, PASS)
    for e in emails:
        prediction = classify_and_learn(e)
        print(f"Subject: {e['subject']}")
        print(f"Predicted Category: {prediction}\n")
