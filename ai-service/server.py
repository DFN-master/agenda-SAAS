import os
from flask import Flask, request, jsonify
from email_summary_local import fetch_emails, summarize_email, classify_email

app = Flask(__name__)

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "ai-service", "version": "0.1.0"})

@app.post("/summaries")
def summaries():
    data = request.get_json(silent=True) or {}
    emails = data.get("emails")

    if not emails:
        host = os.getenv("IMAP_HOST")
        user = os.getenv("IMAP_USER")
        password = os.getenv("IMAP_PASS")
        port = int(os.getenv("IMAP_PORT", 993))
        limit = int(os.getenv("IMAP_LIMIT", 10))

        if not host or not user or not password:
            return jsonify({
                "error": "missing_imap_config",
                "message": "Informe emails no payload ou configure IMAP_HOST/IMAP_USER/IMAP_PASS"
            }), 400

        try:
            emails = fetch_emails(host, port, user, password, limit=limit)
        except Exception as err:
            return jsonify({
                "error": "imap_fetch_failed",
                "message": str(err)
            }), 500

    results = []
    for e in emails:
        body = e.get("body", "")
        summary = summarize_email(body)
        category = classify_email(body)
        results.append({
            "subject": e.get("subject", ""),
            "summary": summary,
            "category": category
        })

    return jsonify({"results": results})

@app.get("/")
def root():
    return jsonify({"message": "AI Service", "health": "/health", "summaries": "/summaries"})

@app.post("/whatsapp/connections/reconnect-all")
def reconnect_all():
    # Simulação de reconexão de conexões do WhatsMeow
    return jsonify({"message": "Reconexões realizadas com sucesso."}), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
