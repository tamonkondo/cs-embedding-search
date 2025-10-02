FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    INDEX_PATH=/app/index/support.idx \
    EMB_PATH=/app/embeddings.jsonl

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
