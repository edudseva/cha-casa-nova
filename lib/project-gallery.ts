const PROJECT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1PPbR9LrlEmrL6Q7C4WaQQg3kbtnUnSVIIVCVmv_wNt0/gviz/tq?tqx=out:csv&sheet=Projeto";

export type ProjectRoom = {
  room: string;
  currentImage: string | null;
  projectImage: string | null;
  description: string;
  featured: boolean;
};

const fallbackRooms: ProjectRoom[] = [
  { room: "Sala", currentImage: null, projectImage: "/project/sala.jpeg", description: "Sala integrada com madeira, verde oliva e tons naturais.", featured: true },
  { room: "Cozinha", currentImage: null, projectImage: "/project/cozinha.jpeg", description: "Verde oliva, madeira e uma bancada pensada para reunir.", featured: false },
  { room: "Banheiro", currentImage: null, projectImage: "/project/banheiro.jpeg", description: "Tons terrosos, luz suave e detalhes acolhedores.", featured: false },
  { room: "Lavanderia", currentImage: null, projectImage: "/project/lavanderia.jpeg", description: "Organização e praticidade aproveitando cada espaço.", featured: false },
  { room: "Quarto", currentImage: null, projectImage: "/project/quarto.jpeg", description: "Texturas naturais e uma atmosfera tranquila para descansar.", featured: false },
];

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function imageUrl(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("/project/")) return raw;
  const driveMatch = raw.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/i);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function isYes(value: string) {
  return ["sim", "s", "true", "1"].includes(value.trim().toLocaleLowerCase("pt-BR"));
}

export async function loadProjectGallery(): Promise<ProjectRoom[]> {
  try {
    const response = await fetch(PROJECT_SHEET_URL, { cache: "no-store", signal: AbortSignal.timeout(12_000), headers: { accept: "text/csv" } });
    if (!response.ok) throw new Error("project sheet unavailable");
    const [headers, ...rows] = parseCsv(await response.text());
    const header = headers.map((value) => value.trim().toLocaleLowerCase("pt-BR"));
    const get = (row: string[], name: string) => row[header.indexOf(name)] ?? "";
    const gallery = rows.flatMap((row) => {
      const room = get(row, "ambiente").trim();
      const currentImage = imageUrl(get(row, "imagem atual"));
      const projectImage = imageUrl(get(row, "imagem do projeto"));
      const active = get(row, "ativo");
      if (!room || (!currentImage && !projectImage) || (active && !isYes(active))) return [];
      return [{ room, currentImage, projectImage, description: get(row, "descrição").trim(), featured: isYes(get(row, "destaque")) }];
    });
    return gallery.length ? gallery : fallbackRooms;
  } catch {
    return fallbackRooms;
  }
}
