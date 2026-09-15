#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Uso: $0 --environment homologation --database NOME --file backup.sql --confirm RESTORE_HOMOLOGATION" >&2
}

environment=""
database=""
file=""
confirmation=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --environment)
      [[ $# -ge 2 ]] || { usage; exit 64; }
      environment="$2"
      shift 2
      ;;
    --database)
      [[ $# -ge 2 ]] || { usage; exit 64; }
      database="$2"
      shift 2
      ;;
    --file)
      [[ $# -ge 2 ]] || { usage; exit 64; }
      file="$2"
      shift 2
      ;;
    --confirm)
      [[ $# -ge 2 ]] || { usage; exit 64; }
      confirmation="$2"
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

[[ "$environment" == "homologation" ]] || {
  echo "Recusado: este script restaura exclusivamente o ambiente de homologação." >&2
  exit 77
}
[[ -n "$database" ]] || { echo "Informe --database explicitamente." >&2; exit 64; }
[[ -n "$file" && -f "$file" ]] || { echo "Arquivo SQL inexistente: $file" >&2; exit 66; }
[[ "$file" == *.sql ]] || { echo "O arquivo deve terminar em .sql." >&2; exit 64; }
[[ "$confirmation" == "RESTORE_HOMOLOGATION" ]] || {
  echo "Recusado: use --confirm RESTORE_HOMOLOGATION." >&2
  exit 77
}

if [[ -f "${file}.sha256" ]]; then
  echo "Verificando integridade do backup..."
  sha256sum --check "${file}.sha256"
else
  echo "Recusado: arquivo de integridade ausente (${file}.sha256)." >&2
  exit 65
fi

echo "Restaurando '$file' somente no D1 de homologação '$database'..."
npx wrangler d1 execute "$database" --remote --file "$file"
echo "Restauração de homologação concluída."
