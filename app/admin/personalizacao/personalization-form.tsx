"use client";

import { FormEvent, ReactNode, useState } from "react";
import Link from "next/link";
import { CalendarDays, Gift, Home, Images, Landmark, Link2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { PixAdminConfig, SiteConfig } from "@/types/gift";

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

export function PersonalizationForm({ initialConfig, initialPix }: { initialConfig: SiteConfig; initialPix: PixAdminConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [pix, setPix] = useState(initialPix);
  const [pixKey, setPixKey] = useState("");
  const [pixValues, setPixValues] = useState(initialConfig.suggestedPixValues.join(", "));
  const [photoGalleryText, setPhotoGalleryText] = useState(initialConfig.photoGallery.map((photo) => `${photo.src} | ${photo.label} | ${photo.alt}${photo.featured ? " | destaque" : ""}`).join("\n"));
  const [saving, setSaving] = useState(false);

  function change<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const suggestedPixValues = pixValues.split(/[;, ]+/).map(Number).filter((value) => Number.isFinite(value) && value > 0);
      const photoGallery = photoGalleryText.split("\n").flatMap((line) => {
        const [src = "", label = "", alt = "", featured = ""] = line.split("|").map((value) => value.trim());
        return src ? [{ src, label: label || "Nossa história", alt: alt || label || "Foto do casal", featured: featured.toLocaleLowerCase("pt-BR") === "destaque" }] : [];
      });
      const response = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { ...config, suggestedPixValues, photoGallery }, pix: { ...pix, key: pixKey } }),
        signal: AbortSignal.timeout(10_000),
      });
      const result = await response.json() as { config?: SiteConfig; pix?: PixAdminConfig; error?: string };
      if (!response.ok || !result.config || !result.pix) throw new Error(result.error ?? "Não foi possível salvar.");
      setConfig(result.config);
      setPix(result.pix);
      setPixKey("");
      setPixValues(result.config.suggestedPixValues.join(", "));
      setPhotoGalleryText(result.config.photoGallery.map((photo) => `${photo.src} | ${photo.label} | ${photo.alt}${photo.featured ? " | destaque" : ""}`).join("\n"));
      toast.success("Personalização salva. As mudanças já estão disponíveis no site.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="admin-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><Home size={18} /></span><span><small>Painel do evento</small>{config.brandLabel}</span></Link>
      <Button asChild variant="outline"><Link href="/admin">Voltar ao painel</Link></Button>
    </header>
    <section className="admin-shell admin-config-shell">
      <div className="admin-heading-row"><div className="admin-heading"><p className="eyebrow">Configuração do evento</p><h1>Personalização</h1><p>Centralize aqui as informações do casal, o evento, a lista, o Pix, as páginas e a identidade visual.</p></div><span className="admin-context-pill"><Sparkles /> Identidade e conteúdo</span></div>
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
        </Tabs>

        <div className="admin-config-save"><p>As alterações são gravadas no banco e não precisam de novo deploy.</p><Button type="submit" size="lg" disabled={saving}><Save />{saving ? "Salvando..." : "Salvar todas as alterações"}</Button></div>
      </form>
    </section>
  </main>;
}
