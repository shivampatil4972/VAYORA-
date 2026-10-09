FROM python:3.11-slim
WORKDIR /work
COPY requirements-research.txt .
RUN pip install --no-cache-dir -r requirements-research.txt
# The repository is bind-mounted at /work by docker-compose.
ENV PYTHONDONTWRITEBYTECODE=1
CMD ["pytest"]
