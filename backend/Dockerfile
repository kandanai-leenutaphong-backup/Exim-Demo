FROM node:22-alpine AS frontend
WORKDIR /src/frontend
ARG VITE_DEMO_MODE=cached
ARG VITE_MSAL_CLIENT_ID
ARG VITE_MSAL_TENANT_ID
ARG VITE_MSAL_API_SCOPE
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE \
    VITE_MSAL_CLIENT_ID=$VITE_MSAL_CLIENT_ID \
    VITE_MSAL_TENANT_ID=$VITE_MSAL_TENANT_ID \
    VITE_MSAL_API_SCOPE=$VITE_MSAL_API_SCOPE
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY data /data
COPY --from=frontend /src/frontend/dist /app/static
ENV DATA_DIR=/data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
