"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Cloud, Eye, Gift, History, Home, Images, Info, Landmark, Link2, LoaderCircle, Redo2, Save, Send, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { validateSiteEditor } from "@/lib/site-config-validation";
import type { PixAdminConfig, SiteConfig, SiteConfigVersionSummary, SiteEditorIssue } from "@/types/gift";

const colors: Array<[keyof SiteConfig["theme"], string]> = [
  ["background", "Fundo"], ["surface", "Cartões"], ["primary", "Cor principal"],
  ["primaryDark", "Principal escuro"], ["pixBackground", "Fundo do Pix"],
  ["accent", "Destaque"], ["text", "Texto"], ["mutedText", "Texto secundário"],
];

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return <label className={wide ? "wide" : undefined}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="admin-toggle"><div><strong>{label}</strong><small>{description}</small></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

type EditorSnapshot = { config: SiteConfig; pix: PixAdminConfig; pixValues: string; photoGalleryText: string };
type EditorResponse = {
  error?: string;
  savedAt?: string;
  issues?: SiteEditorIssue[];
  config?: SiteConfig;
  pix?: PixAdminConfig;
  publishedConfig?: SiteConfig;
  publishedPix?: PixAdminConfig;
  draftUpdatedAt?: string | null;
  versions?: SiteConfigVersionSummary[];
};

export function PersonalizationForm({
  initialConfig,
  initialPix,
  publishedConfig: initialPublishedConfig,
  publishedPix: initialPublishedPix,
  initialDraftUpdatedAt,
  initialVersions,
}: {
  initialConfig: SiteConfig;
  initialPix: PixAdminConfig;
  publishedConfig: SiteConfig;
  publishedPix: PixAdminConfig;
  initialDraftUpdatedAt: string | null;
  initialVersions: SiteConfigVersionSummary[];
}) {
  const [config, setConfig] = useState(initialConfig);
  const [pix, setPix] = useState(initialPix);
  const [publishedConfig, setPublishedConfig] = useState(initialPublishedConfig);
  const [publishedPix, setPublishedPix] = useState(initialPublishedPix);
  const [pixKey, setPixKey] = useState("");
  const [pixValues, setPixValues] = useState(initialConfig.suggestedPixValues.join(", "));
  const [photoGalleryText, setPhotoGalleryText] = useState(initialConfig.photoGallery.map((photo) => `${photo.src} | ${photo.label} | ${photo.alt}${photo.featured ? " | destaque" : ""}`).join("\n"));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "pending" | "saving" | "error">(initialDraftUpdatedAt ? "saved" : "saved");
  const [savedAt, setSavedAt] = useState<string | null>(initialDraftUpdatedAt);
  const [versions, setVersions] = useState(initialVersions);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const applyingHistoryRef = useRef(false);

  const preparedConfig = useMemo<SiteConfig>(() => {
    const suggestedPixValues = pixValues.split(/[;, ]+/).map(Number).filter((value) => Number.isFinite(value) && value > 0);
    const photoGallery = photoGalleryText.split("\n").flatMap((line) => {
      const [src = "", label = "", alt = "", featured = ""] = line.split("|").map((value) => value.trim());
      return src ? [{ src, label: label || "Nossa história", alt: alt || label || "Foto do casal", featured: featured.toLocaleLowerCase("pt-BR") === "destaque" }] : [];
    });
    return { ...config, suggestedPixValues, photoGallery };
  }, [config, photoGalleryText, pixValues]);

  const issues = useMemo(() => validateSiteEditor(preparedConfig, pix, Boolean(pixKey.trim())), [preparedConfig, pix, pixKey]);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  const serializedDraft = useMemo(() => JSON.stringify({ config: preparedConfig, pix }), [preparedConfig, pix]);
  const lastSavedRef = useRef(serializedDraft);

  const snapshot = useCallback((): EditorSnapshot => ({ config, pix, pixValues, photoGalleryText }), [config, photoGalleryText, pix, pixValues]);

  function applySnapshot(next: EditorSnapshot) {
    applyingHistoryRef.current = true;
    setConfig(next.config);
    setPix(next.pix);
    setPixValues(next.pixValues);
    setPhotoGalleryText(next.photoGalleryText);
    window.setTimeout(() => { applyingHistoryRef.current = false; }, 0);
  }

  useEffect(() => {
    if (!historyRef.current.length) historyRef.current = [snapshot()];
    if (applyingHistoryRef.current) return;
    const timer = window.setTimeout(() => {
      const next = snapshot();
      const previous = historyRef.current.at(-1);
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        historyRef.current = [...historyRef.current.slice(-19), next];
        futureRef.current = [];
        setCanUndo(historyRef.current.length > 1);
        setCanRedo(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  const saveDraft = useCallback(async (notify = false) => {
    setSaving(true);
    setSaveState("saving");
    try {
      const response = await fetch("/api/admin/editor", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "draft", config: preparedConfig, pix }),
        signal: AbortSignal.timeout(10_000),
      });
      const result = await response.json() as EditorResponse;
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o rascunho.");
      lastSavedRef.current = JSON.stringify({ config: preparedConfig, pix });
      setSavedAt(result.savedAt ?? new Date().toISOString());
      setSaveState("saved");
      if (notify) toast.success("Rascunho salvo. O site público ainda não foi alterado.");
      return true;
    } catch (error) {
      setSaveState("error");
      if (notify) toast.error(error instanceof Error ? error.message : "Não foi possível salvar o rascunho.");
      return false;
    } finally { setSaving(false); }
  }, [pix, preparedConfig]);

  useEffect(() => {
    if (serializedDraft === lastSavedRef.current) return;
    setSaveState("pending");
    const timer = window.setTimeout(() => { void saveDraft(false); }, 1400);
    return () => window.clearTimeout(timer);
  }, [saveDraft, serializedDraft]);

  function change<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await saveDraft(true);
  }

  async function publish() {
    if (errors.length) {
      toast.error("Corrija os campos indicados antes de publicar.");
      return;
    }
    setPublishing(true);
    try {
      const response = await fetch("/api/admin/editor", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", config: preparedConfig, pix, pixKey }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json() as EditorResponse;
      if (!response.ok || !result.config || !result.pix) throw new Error(result.error ?? "Não foi possível publicar.");
      setConfig(result.config);
      setPix(result.pix);
      setPublishedConfig(result.publishedConfig ?? result.config);
      setPublishedPix(result.publishedPix ?? result.pix);
      setVersions(result.versions ?? versions);
      setPixKey("");
      setPixValues(result.config.suggestedPixValues.join(", "));
      setPhotoGalleryText(result.config.photoGallery.map((photo) => `${photo.src} | ${photo.label} | ${photo.alt}${photo.featured ? " | destaque" : ""}`).join("\n"));
      lastSavedRef.current = JSON.stringify({ config: result.config, pix: result.pix });
      setSavedAt(null);
      setSaveState("saved");
      toast.success("Alterações publicadas no site.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally { setPublishing(false); }
  }

  async function openPreview() {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Permita a abertura da prévia nesta janela.");
      return;
    }
    previewWindow.opener = null;
    const saved = serializedDraft === lastSavedRef.current || await saveDraft(false);
    if (saved) previewWindow.location.href = "/admin/previa";
    else {
      previewWindow.close();
      toast.error("Salve o rascunho antes de abrir a prévia.");
    }
  }

  async function restoreVersion(versionId: number) {
    try {
      const response = await fetch("/api/admin/editor", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restore", versionId }), signal: AbortSignal.timeout(10_000) });
      const result = await response.json() as EditorResponse;
      if (!response.ok || !result.config || !result.pix) throw new Error(result.error ?? "Não foi possível restaurar a versão.");
      const restored = { config: result.config, pix: result.pix, pixValues: result.config.suggestedPixValues.join(", "), photoGalleryText: result.config.photoGallery.map((photo) => `${photo.src} | ${photo.label} | ${photo.alt}${photo.featured ? " | destaque" : ""}`).join("\n") };
      applySnapshot(restored);
      lastSavedRef.current = JSON.stringify({ config: result.config, pix: result.pix });
      setSavedAt(result.draftUpdatedAt ?? new Date().toISOString());
      setSaveState("saved");
      toast.success("Versão restaurada como rascunho. Revise e publique quando estiver pronta.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível restaurar."); }
  }

  function undo() {
    if (historyRef.current.length < 2) return;
    const current = historyRef.current.pop()!;
    futureRef.current.push(current);
    applySnapshot(historyRef.current.at(-1)!);
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(true);
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(next);
    applySnapshot(next);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
  }

  function restorePublished() {
    const restored = { config: publishedConfig, pix: publishedPix, pixValues: publishedConfig.suggestedPixValues.join(", "), photoGalleryText: publishedConfig.photoGallery.map((photo) => `${photo.src} | ${photo.label} | ${photo.alt}${photo.featured ? " | destaque" : ""}`).join("\n") };
    applySnapshot(restored);
    toast.info("A versão publicada foi carregada no editor. Ela será salva como rascunho.");
  }

  const saveLabel = saveState === "saving" ? "Salvando rascunho…" : saveState === "pending" ? "Alterações pendentes" : saveState === "error" ? "Falha ao salvar" : savedAt ? `Rascunho salvo às ${new Date(savedAt.includes("T") ? savedAt : `${savedAt.replace(" ", "T")}Z`).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Versão publicada";

  return <main className="admin-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><Home size={18} /></span><span><small>Painel do evento</small>{config.brandLabel}</span></Link>
      <Button asChild variant="outline"><Link href="/admin" aria-label="Voltar ao painel"><ArrowLeft /> <span className="admin-back-label">Voltar ao painel</span></Link></Button>
    </header>
    <section className="admin-shell admin-config-shell">
      <div className="admin-heading-row"><div className="admin-heading"><p className="eyebrow">Configuração do evento</p><h1>Personalização</h1><p>Centralize aqui as informações do casal, o evento, a lista, o Pix, as páginas e a identidade visual.</p></div><span className="admin-context-pill"><Sparkles /> Identidade e conteúdo</span></div>
      <div className="editor-command-bar">
        <div className={`editor-save-state ${saveState}`} aria-live="polite">{saveState === "saving" ? <LoaderCircle className="spin" /> : saveState === "error" ? <AlertTriangle /> : <Cloud />}<span><strong>{saveLabel}</strong><small>Rascunhos não alteram o site até a publicação.</small></span></div>
        <div className="editor-command-actions">
          <Button type="button" variant="ghost" disabled={!canUndo} onClick={undo} title="Desfazer última alteração"><Undo2 /> Desfazer</Button>
          <Button type="button" variant="ghost" disabled={!canRedo} onClick={redo} title="Refazer alteração"><Redo2 /> Refazer</Button>
          <Button type="button" variant="outline" onClick={() => void openPreview()}><Eye /> Pré-visualizar</Button>
          <Button type="button" onClick={() => void publish()} disabled={publishing || saving || errors.length > 0} className="editor-publish-button">{publishing ? <LoaderCircle className="spin" /> : <Send />} {publishing ? "Publicando…" : "Publicar alterações"}</Button>
        </div>
      </div>
      <div className="editor-guidance-grid">
        <article><Info /><div><strong>Edite com segurança</strong><p>O salvamento automático cria um rascunho privado. Use a prévia para conferir antes de publicar.</p></div></article>
        <article className={errors.length ? "has-errors" : "is-ready"}>{errors.length ? <AlertTriangle /> : <CheckCircle2 />}<div><strong>{errors.length ? `${errors.length} ${errors.length === 1 ? "ajuste necessário" : "ajustes necessários"}` : "Pronto para publicar"}</strong><p>{errors.length ? errors[0].message : warnings.length ? `${warnings.length} aviso(s) opcional(is) não impedem a publicação.` : "Os campos obrigatórios estão válidos."}</p></div></article>
      </div>
      {issues.length > 0 && <details className="editor-validation-details" open={errors.length > 0}><summary>Ver validação do conteúdo ({issues.length})</summary><ul>{issues.map((issue, index) => <li key={`${issue.field}-${index}`} className={issue.level}><span>{issue.level === "error" ? "Corrigir" : "Atenção"}</span>{issue.message}</li>)}</ul></details>}
      <form onSubmit={submit} className="admin-config-form">
        <Tabs defaultValue="identidade" className="admin-config-tabs">
          <TabsList>
            <span className="admin-config-nav-label">Seções</span>
            <TabsTrigger value="identidade"><Sparkles /> Identidade</TabsTrigger>
            <TabsTrigger value="evento"><CalendarDays /> Evento</TabsTrigger>
            <TabsTrigger value="presentes"><Gift /> Presentes</TabsTrigger>
            <TabsTrigger value="pix"><Landmark /> Pix</TabsTrigger>
            <TabsTrigger value="visual"><Images /> Visual</TabsTrigger>
            <TabsTrigger value="paginas"><Link2 /> Páginas e links</TabsTrigger>
            <TabsTrigger value="versoes"><History /> Versões</TabsTrigger>
          </TabsList>

          <TabsContent value="identidade" className="admin-config-panel">
            <div className="admin-config-title"><h2>Identidade do site</h2><p>Informações principais exibidas na abertura, no cabeçalho e no rodapé.</p></div>
            <div className="admin-config-grid">
              <Field label="Nomes do casal"><Input value={config.coupleNames} onChange={(e) => change("coupleNames", e.target.value)} /></Field>
              <Field label="Nome curto do site"><Input value={config.brandLabel} onChange={(e) => change("brandLabel", e.target.value)} /></Field>
              <Field label="Título principal" wide><Input value={config.eventTitle} onChange={(e) => change("eventTitle", e.target.value)} /></Field>
              <Field label="Frase acima do título" wide><Input value={config.heroEyebrow} onChange={(e) => change("heroEyebrow", e.target.value)} /></Field>
              <Field label="Mensagem principal" wide><Textarea rows={5} value={config.welcomeMessage} onChange={(e) => change("welcomeMessage", e.target.value)} /></Field>
              <Field label="Título da janela de boas-vindas" wide><Input value={config.welcomeTitle} onChange={(e) => change("welcomeTitle", e.target.value)} /></Field>
              <Field label="Texto da janela de boas-vindas" wide><Textarea rows={3} value={config.welcomeDescription} onChange={(e) => change("welcomeDescription", e.target.value)} /></Field>
              <Field label="Mensagem do rodapé" wide><Input value={config.footerMessage} onChange={(e) => change("footerMessage", e.target.value)} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="evento" className="admin-config-panel">
            <div className="admin-config-title"><h2>Dados do evento</h2><p>Preencha somente o que quiser mostrar aos convidados.</p></div>
            <div className="admin-config-grid">
              <Field label="Data"><Input type="date" value={config.eventDate ?? ""} onChange={(e) => change("eventDate", e.target.value || null)} /></Field>
              <Field label="Horário"><Input type="time" value={config.eventTime} onChange={(e) => change("eventTime", e.target.value)} /></Field>
              <Field label="Local ou endereço do evento" wide><Textarea rows={3} value={config.eventLocation} onChange={(e) => change("eventLocation", e.target.value)} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="presentes" className="admin-config-panel">
            <div className="admin-config-title"><h2>Lista de presentes</h2><p>Controle a planilha, o endereço de entrega e os textos dessa seção.</p></div>
            <Toggle label="Exibir lista de presentes" description="Oculta a seção e seus botões quando desligado." checked={config.giftsEnabled} onChange={(value) => change("giftsEnabled", value)} />
            <div className="admin-config-grid">
              <Field label="Link CSV da planilha Google" hint="Use o endereço publicado da aba Itens." wide><Input value={config.giftSheetCsvUrl} onChange={(e) => change("giftSheetCsvUrl", e.target.value)} /></Field>
              <Field label="Endereço para entrega" wide><Textarea rows={4} value={config.deliveryAddress} onChange={(e) => change("deliveryAddress", e.target.value)} /></Field>
              <Field label="Frase acima do título" wide><Input value={config.giftSectionEyebrow} onChange={(e) => change("giftSectionEyebrow", e.target.value)} /></Field>
              <Field label="Título da seção" wide><Input value={config.giftSectionTitle} onChange={(e) => change("giftSectionTitle", e.target.value)} /></Field>
              <Field label="Descrição da seção" wide><Textarea rows={3} value={config.giftSectionDescription} onChange={(e) => change("giftSectionDescription", e.target.value)} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="pix" className="admin-config-panel">
            <div className="admin-config-title"><h2>Recebimento por Pix</h2><p>A chave não é exibida depois de salva. Para substituí-la, informe uma nova chave.</p></div>
            <div className="admin-security-note"><ShieldCheck size={20} /><p><strong>Área protegida</strong><span>Somente administradores autorizados podem alterar os dados do Pix.</span></p></div>
            <Toggle label="Aceitar contribuições por Pix" description="Desativa o gerador e oculta a seção quando desligado." checked={pix.enabled && config.pixEnabled} onChange={(value) => { setPix((current) => ({ ...current, enabled: value })); change("pixEnabled", value); }} />
            <div className="admin-config-grid">
              <Field label="Chave Pix" hint={pix.hasKey ? "Já existe uma chave configurada. Deixe vazio para mantê-la." : "Informe telefone, CPF, e-mail ou chave aleatória."} wide><Input type="password" autoComplete="off" value={pixKey} placeholder={pix.hasKey ? "•••••••••••••••• (chave configurada)" : "Digite a chave Pix"} onChange={(e) => setPixKey(e.target.value)} /></Field>
              <Field label="Nome do favorecido"><Input value={pix.receiver} maxLength={25} onChange={(e) => setPix((current) => ({ ...current, receiver: e.target.value }))} /></Field>
              <Field label="Cidade do favorecido"><Input value={pix.city} maxLength={15} onChange={(e) => setPix((current) => ({ ...current, city: e.target.value }))} /></Field>
              <Field label="Valores sugeridos, separados por vírgula" wide><Input value={pixValues} onChange={(e) => setPixValues(e.target.value)} /></Field>
              <Field label="Frase acima do título" wide><Input value={config.pixSectionEyebrow} onChange={(e) => change("pixSectionEyebrow", e.target.value)} /></Field>
              <Field label="Título da seção" wide><Input value={config.pixSectionTitle} onChange={(e) => change("pixSectionTitle", e.target.value)} /></Field>
              <Field label="Descrição da seção" wide><Textarea rows={3} value={config.pixSectionDescription} onChange={(e) => change("pixSectionDescription", e.target.value)} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="visual" className="admin-config-panel">
            <div className="admin-config-title"><h2>Fotos e identidade visual</h2><p>Use caminhos de imagens já existentes no projeto ou endereços HTTPS.</p></div>
            <div className="admin-config-grid">
              <Field label="Imagem principal" hint="Exemplo: /project/sala.jpeg" wide><Input value={config.heroImage} onChange={(e) => change("heroImage", e.target.value)} /></Field>
              <Field label="Descrição da imagem principal" wide><Input value={config.heroImageAlt} onChange={(e) => change("heroImageAlt", e.target.value)} /></Field>
              <Field label="Foto do casal" hint="Exemplo: /photos/nos-dois.jpeg" wide><Input value={config.couplePhoto} onChange={(e) => change("couplePhoto", e.target.value)} /></Field>
              <Field label="Descrição da foto do casal" wide><Input value={config.couplePhotoAlt} onChange={(e) => change("couplePhotoAlt", e.target.value)} /></Field>
              <Field label="Galeria de fotos" hint="Uma foto por linha: endereço | legenda | descrição. Acrescente | destaque nas fotos maiores." wide><Textarea rows={9} value={photoGalleryText} onChange={(e) => setPhotoGalleryText(e.target.value)} placeholder="/photos/nossa-foto.jpeg | Um dia especial | Nós dois celebrando | destaque" /></Field>
            </div>
            <div className="admin-color-section"><h2>Cores do site</h2><div className="admin-color-grid">
              {colors.map(([key, label]) => <Field key={key} label={label}><span><input type="color" value={config.theme[key]} onChange={(e) => setConfig((current) => ({ ...current, theme: { ...current.theme, [key]: e.target.value } }))} /><Input value={config.theme[key]} onChange={(e) => setConfig((current) => ({ ...current, theme: { ...current.theme, [key]: e.target.value } }))} /></span></Field>)}
            </div></div>
          </TabsContent>

          <TabsContent value="paginas" className="admin-config-panel">
            <div className="admin-config-title"><h2>Páginas, contato e compartilhamento</h2><p>Escolha quais páginas aparecem e configure dados para redes sociais e buscadores.</p></div>
            <div className="admin-toggle-grid">
              <Toggle label="Página do projeto" description="Mostra o acesso ao projeto do novo lar." checked={config.projectPageEnabled} onChange={(value) => change("projectPageEnabled", value)} />
              <Toggle label="Página de fotos" description="Mostra o acesso à história do casal." checked={config.photosPageEnabled} onChange={(value) => change("photosPageEnabled", value)} />
            </div>
            <div className="admin-config-grid">
              <Field label="Link do WhatsApp" hint="Exemplo: https://wa.me/5561999999999" wide><Input value={config.whatsappUrl} onChange={(e) => change("whatsappUrl", e.target.value)} /></Field>
              <Field label="Link do Instagram" hint="Exemplo: https://instagram.com/usuario" wide><Input value={config.instagramUrl} onChange={(e) => change("instagramUrl", e.target.value)} /></Field>
              <Field label="Título para Google e compartilhamento" wide><Input value={config.seoTitle} onChange={(e) => change("seoTitle", e.target.value)} /></Field>
              <Field label="Descrição para Google e compartilhamento" wide><Textarea rows={3} value={config.seoDescription} onChange={(e) => change("seoDescription", e.target.value)} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="versoes" className="admin-config-panel">
            <div className="admin-config-title"><h2>Histórico e recuperação</h2><p>Cada publicação gera uma versão. Restaurar nunca altera o site imediatamente: a versão volta primeiro como rascunho.</p></div>
            <div className="editor-version-actions"><Button type="button" variant="outline" onClick={restorePublished}><Undo2 /> Carregar versão publicada</Button></div>
            <div className="editor-version-list">
              {versions.map((version, index) => <article key={version.id}><span><History /></span><div><strong>{index === 0 ? "Publicação mais recente" : `Publicação anterior ${index}`}</strong><small>{new Date(`${version.createdAt.replace(" ", "T")}Z`).toLocaleString("pt-BR")} · {version.createdByEmail}</small></div><Button type="button" variant="outline" size="sm" onClick={() => void restoreVersion(version.id)}>Restaurar como rascunho</Button></article>)}
              {!versions.length && <div className="editor-version-empty"><History /><strong>Nenhuma versão registrada ainda</strong><p>A primeira aparecerá aqui após a próxima publicação.</p></div>}
            </div>
          </TabsContent>
        </Tabs>

        <div className="admin-config-save"><p>O rascunho é privado e fica disponível quando você retornar. A chave Pix somente é enviada ao publicar.</p><Button type="submit" size="lg" variant="outline" disabled={saving}><Save />{saving ? "Salvando…" : "Salvar rascunho agora"}</Button></div>
      </form>
    </section>
  </main>;
}
