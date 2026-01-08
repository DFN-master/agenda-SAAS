# Dockerfile for AI Service

FROM python:3.12-slim

WORKDIR /app

COPY ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ai-service/ .

EXPOSE 5000

CMD ["python", "email_summary.py"]