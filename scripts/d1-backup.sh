#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Uso: $0 --database NOME [--output backups/arquivo.sql]" >&2
}

database=""
output=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --database)
      [[ $# -ge 2 ]] || { usage; exit 64; }
      database="$2"
      shift 2
      ;;
    --output)
      [[ $# -ge 2 ]] || { usage; exit 64; }
      output="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $1" >&2
      usage
      exit 64
      ;;
  esac
done

[[ -n "$database" ]] || { echo "Informe --database explicitamente." >&2; exit 64; }

source "$(dirname "$0")/d1-target-guard.sh"
verify_d1_target "$database" "${PRODUCTION_D1_ID:-}" "${HOMOLOGATION_D1_ID:-}"

safe_database="$(printf '%s' "$database" | tr -cs '[:alnum:]._- ' '-' | tr ' ' '-')"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="${output:-backups/${safe_database}-${timestamp}.sql}"

[[ "$output" == *.sql ]] || { echo "O arquivo de saída deve terminar em .sql." >&2; exit 64; }
[[ ! -e "$output" ]] || { echo "Recusado: $output já existe." >&2; exit 73; }
[[ ! -e "${output}.sha256" ]] || { echo "Recusado: ${output}.sha256 já existe." >&2; exit 73; }

mkdir -p "$(dirname "$output")"

echo "Exportando o D1 '$database' em modo remoto para '$output'..."
npx wrangler d1 export "$database" --remote --output "$output"

[[ -s "$output" ]] || { echo "Falha: exportação vazia." >&2; exit 74; }
sha256sum "$output" > "${output}.sha256"

echo "Backup concluído. Integridade registrada em ${output}.sha256"
