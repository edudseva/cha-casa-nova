#!/usr/bin/env bash
# Source from the D1 export/restore scripts. Refuses ambiguous database names.
verify_d1_target() {
  local database="$1" expected_id="$2" forbidden_id="$3" listing
  [[ "$expected_id" =~ ^[0-9a-fA-F-]{36}$ && "$forbidden_id" =~ ^[0-9a-fA-F-]{36}$ && "$expected_id" != "$forbidden_id" ]] || {
    echo "Recusado: informe IDs físicos distintos e válidos para produção e homologação." >&2
    return 77
  }
  listing="$(npx wrangler d1 list --json)" || { echo "Não foi possível validar os bancos na conta Cloudflare." >&2; return 69; }
  printf '%s' "$listing" | node -e '
    let data = "";
    process.stdin.on("data", part => data += part);
    process.stdin.on("end", () => {
      try {
        const list = JSON.parse(data);
        const [name, expected, forbidden] = process.argv.slice(1);
        const matches = Array.isArray(list) ? list.filter(row => row.name === name) : [];
        if (matches.length !== 1 || matches[0].uuid?.toLowerCase() !== expected.toLowerCase() ||
            matches[0].uuid?.toLowerCase() === forbidden.toLowerCase()) process.exitCode = 77;
      } catch { process.exitCode = 77; }
    });
  ' "$database" "$expected_id" "$forbidden_id" || {
    echo "Recusado: o nome informado não corresponde ao D1 físico autorizado." >&2
    return 77
  }
}
