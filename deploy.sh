#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.prod.yml)
ACTION="${1:-all}"

require_file() {
  if [ ! -f "$1" ]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

ensure_network() {
  if ! docker network inspect trx_trxnet >/dev/null 2>&1; then
    echo "Docker network trx_trxnet was not found. Start TRX first." >&2
    exit 1
  fi
}

pull_latest() {
  git fetch origin main
  git checkout main
  git reset --hard origin/main
}

validate_env() {
  require_file .env
  ensure_network
}

show_status() {
  "${COMPOSE[@]}" ps
}

case "$ACTION" in
  all)
    pull_latest
    validate_env
    "${COMPOSE[@]}" build
    "${COMPOSE[@]}" up -d --wait
    show_status
    ;;
  infra)
    pull_latest
    validate_env
    "${COMPOSE[@]}" up -d --wait ra-postgres ra-redis ra-rabbitmq ra-minio ra-media
    show_status
    ;;
  app)
    pull_latest
    validate_env
    "${COMPOSE[@]}" build ra-app
    "${COMPOSE[@]}" up -d --wait ra-app ra-media
    show_status
    ;;
  worker)
    pull_latest
    validate_env
    "${COMPOSE[@]}" build ra-worker
    "${COMPOSE[@]}" up -d --wait ra-worker
    show_status
    ;;
  status)
    validate_env
    show_status
    ;;
  logs)
    shift || true
    validate_env
    if [ "$#" -eq 0 ]; then
      "${COMPOSE[@]}" logs --tail=120
    else
      "${COMPOSE[@]}" logs --tail=120 "$@"
    fi
    ;;
  *)
    echo "Usage: $0 {all|infra|app|worker|status|logs [service...]}" >&2
    exit 2
    ;;
esac
