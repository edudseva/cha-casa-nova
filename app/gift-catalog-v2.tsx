"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bath, BedDouble, Bot, Check, Copy, Drill, ExternalLink,
  Gift as GiftIcon, HandHeart, Heart, Home, Lamp, LoaderCircle, Lock, MapPin, Search, Shirt, SlidersHorizontal, Sparkles,
  UtensilsCrossed, WashingMachine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Gift, SiteConfig } from "@/types/gift";

const categoryIcons: Record<string, typeof GiftIcon> = {
  Cozinha: UtensilsCrossed,
  Eletrodomésticos: WashingMachine,
  Lavanderia: Shirt,
  Automação: Bot,
  Ferramentas: Drill,
  Limpeza: Sparkles,
  Banheiro: Bath,
  "Sala e decoração": Lamp,
  "Mesa posta": UtensilsCrossed,
  Quarto: BedDouble,
  Organização: Home,
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type Props = { gifts: Gift[]; config: SiteConfig };

type PixResult = {
  amount: number;
  receiver: string;
  pixCopyPaste: string;
  transactionReference: string;
};

type PriceRange = "todos" | "ate-100" | "101-250" | "251-500" | "acima-500" | "a-definir";

const priorityOrder = { alta: 0, media: 1, baixa: 2 } as const;

function matchesPriceRange(gift: Gift, priceRange: PriceRange) {
  if (priceRange === "todos") return true;
  if (priceRange === "a-definir") return gift.price === null;
  if (gift.price === null) return false;
  if (priceRange === "ate-100") return gift.price <= 100;
  if (priceRange === "101-250") return gift.price > 100 && gift.price <= 250;
  if (priceRange === "251-500") return gift.price > 250 && gift.price <= 500;
  return gift.price > 500;
}

function GiftArtwork({ gift, Icon }: { gift: Gift; Icon: typeof GiftIcon }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageQuery = new URLSearchParams({ gift: gift.id });
  if (gift.url) imageQuery.set("url", gift.url);
  if (gift.image) imageQuery.set("image", gift.image);
  imageQuery.set("name", gift.name);
  imageQuery.set("category", gift.category);
  // New revision invalidates browser-cached fallbacks from earlier releases.
  imageQuery.set("v", "sheet-images-3");
  const imageSrc = `/api/product-image?${imageQuery.toString()}`;
  const hasImage = !imageFailed;

  return <div className={`gift-image-placeholder ${hasImage ? "has-product-image" : ""}`}>
    {hasImage ? <img src={imageSrc!} alt={gift.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <Icon strokeWidth={1.35} />}
  </div>;
}

export function GiftCatalogV2({ gifts, config }: Props) {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [priceRange, setPriceRange] = useState<PriceRange>("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [catalogGifts, setCatalogGifts] = useState(gifts);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogWarning, setCatalogWarning] = useState("");
  const [search, setSearch] = useState("");
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [deliveryChoice, setDeliveryChoice] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [message, setMessage] = useState("");
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pixAmount, setPixAmount] = useState("");
  const [pixResult, setPixResult] = useState<PixResult | null>(null);
  const [pixQrCode, setPixQrCode] = useState("");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixReady, setPixReady] = useState(false);
  const [pixReceiver, setPixReceiver] = useState("");
  const [pixGuestName, setPixGuestName] = useState("");
  const [pixGuestContact, setPixGuestContact] = useState("");
  const [pixMessage, setPixMessage] = useState("");
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [serviceWarning, setServiceWarning] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [storeOpened, setStoreOpened] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadReservations() {
      try {
        const response = await fetch("/api/reservations", {
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) throw new Error("reservations unavailable");
        const reservations = await response.json() as { reservations?: Array<{ giftId: string }> };
        if (!active) return;
        setPurchased(new Set(reservations.reservations?.map((item) => item.giftId) ?? []));
        setServiceWarning("");
      } catch {
        if (active) setServiceWarning("Não foi possível verificar quais presentes já foram escolhidos. Tente novamente antes de comprar.");
      } finally {
        if (active) setAvailabilityLoading(false);
      }
    }

    async function loadPix() {
      try {
        const response = await fetch("/api/pix", {
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return;
        const pix = await response.json() as { ready?: boolean; receiver?: string | null };
        if (active) { setPixReady(Boolean(pix.ready)); setPixReceiver(pix.receiver ?? ""); }
      } catch { /* Pix remains visibly unavailable until configured. */ }
    }

    async function loadGifts() {
      try {
        const response = await fetch("/api/gifts", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error("Catálogo indisponível");
        const liveCatalog = await response.json() as { gifts?: Gift[]; source?: string };
        if (!Array.isArray(liveCatalog.gifts)) throw new Error("Catálogo inválido");
        if (active) {
          setCatalogGifts(liveCatalog.gifts);
          setCatalogWarning(liveCatalog.source === "database-cache" ? "Exibindo a última lista sincronizada. Tentaremos atualizar novamente em instantes." : "");
        }
      } catch { if (active) setCatalogWarning("Não conseguimos atualizar a lista. Tentaremos novamente em instantes."); }
      finally { if (active) setCatalogLoading(false); }
    }

    void Promise.all([loadReservations(), loadPix(), loadGifts()]);
    const refreshTimer = window.setInterval(() => { if (document.visibilityState === "visible") void loadGifts(); }, 60_000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    function welcomeBack() {
      if (document.visibilityState === "visible" && storeOpened && selectedGift) {
        toast.info("Voltou da loja? Confirme a compra aqui para que o presente fique indisponível.");
      }
    }
    document.addEventListener("visibilitychange", welcomeBack);
    return () => document.removeEventListener("visibilitychange", welcomeBack);
  }, [selectedGift, storeOpened]);

  useEffect(() => {
    if (window.sessionStorage.getItem("welcome-seen") === "true") return;
    const timer = window.setTimeout(() => setWelcomeOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function closeWelcome() {
    window.sessionStorage.setItem("welcome-seen", "true");
    setWelcomeOpen(false);
  }

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(catalogGifts.map((gift) => gift.category))).sort()],
    [catalogGifts]
  );
  const filteredGifts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return catalogGifts
      .filter((gift) =>
        (category === "Todos" || gift.category === category) &&
        matchesPriceRange(gift, priceRange) &&
        (!term || gift.name.toLocaleLowerCase("pt-BR").includes(term) || gift.category.toLocaleLowerCase("pt-BR").includes(term))
      )
      .sort((first, second) =>
        Number(purchased.has(first.id)) - Number(purchased.has(second.id)) ||
        priorityOrder[first.priority] - priorityOrder[second.priority]
      );
  }, [category, catalogGifts, priceRange, purchased, search]);

  const purchasedGiftCount = catalogGifts.filter((gift) => purchased.has(gift.id)).length;
  const availableCount = Math.max(catalogGifts.length - purchasedGiftCount, 0);

  function resetGiftForm() {
    setSelectedGift(null);
    setGuestName("");
    setGuestContact("");
    setDeliveryChoice("");
    setOrderReference("");
    setMessage("");
    setPurchaseConfirmed(false);
    setShowConfirmation(false);
    setStoreOpened(false);
  }

  async function confirmGiftPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGift) return;
    if (!deliveryChoice) {
      toast.error("Escolha como o presente será entregue antes de confirmar.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          giftId: selectedGift.id, guestName, guestContact, deliveryChoice,
          orderReference, message, purchaseConfirmed, website: "",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível confirmar o presente.");
      setPurchased((current) => new Set(current).add(selectedGift.id));
      toast.success("Compra confirmada. Obrigado pelo presente!");
      resetGiftForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar o presente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function generatePix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPixLoading(true);
    try {
      const amount = Number(pixAmount.replace(",", "."));
      const response = await fetch("/api/pix", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount }),
      });
      const data = (await response.json()) as PixResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível gerar o Pix.");
      setPixResult(data);
      try {
        const { default: QRCode } = await import("qrcode");
        setPixQrCode(await QRCode.toDataURL(data.pixCopyPaste, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: { dark: "#2f3f31", light: "#fffaf2" },
        }));
      } catch {
        setPixQrCode("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o Pix.");
    } finally {
      setPixLoading(false);
    }
  }

  async function copyPix() {
    if (!pixResult) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível");
      await navigator.clipboard.writeText(pixResult.pixCopyPaste);
    } catch {
      const temporaryField = document.createElement("textarea");
      temporaryField.value = pixResult.pixCopyPaste;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "fixed";
      temporaryField.style.opacity = "0";
      document.body.appendChild(temporaryField);
      temporaryField.select();
      document.execCommand("copy");
      temporaryField.remove();
    }
    toast.success("Código Pix copiado!");
  }

  async function copyDeliveryAddress() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível");
      await navigator.clipboard.writeText(config.deliveryAddress);
    } catch {
      const temporaryField = document.createElement("textarea");
      temporaryField.value = config.deliveryAddress;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "fixed";
      temporaryField.style.opacity = "0";
      document.body.appendChild(temporaryField);
      temporaryField.select();
      document.execCommand("copy");
      temporaryField.remove();
    }
    toast.success("Endereço copiado!");
  }

  async function confirmPix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pixResult) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: pixResult.amount, guestName: pixGuestName, guestContact: pixGuestContact,
          transactionReference: pixResult.transactionReference, message: pixMessage,
          paymentConfirmed: pixConfirmed, website: "",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível registrar o Pix.");
      setPixResult(null); setPixQrCode(""); setPixAmount(""); setPixGuestName(""); setPixGuestContact(""); setPixMessage(""); setPixConfirmed(false);
      toast.success("Pix registrado. Muito obrigado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o Pix.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Ir para o início"><span className="brand-mark"><Home size={18} /></span><span>{config.brandLabel}</span></a>
        <nav aria-label="Navegação principal"><a href="#presentes">Presentes</a><a href="#pix">Pix</a><a href="/projeto">O projeto</a><a href="/fotos">Fotos</a></nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">{config.heroEyebrow}</p>
          <h1>{config.eventTitle}</h1>
          <p className="hero-message">{config.welcomeMessage}</p>
          <div className="hero-actions">
            <Button asChild size="lg" className="main-button"><a href="#presentes"><GiftIcon /> Escolher um presente</a></Button>
            <Button asChild size="lg" variant="outline" className="outline-button"><a href="#pix"><Heart /> Contribuir com Pix</a></Button>
          </div>
          <div className="hero-stats" aria-label="Resumo do chá">
            <div><strong>{purchasedGiftCount} de {catalogGifts.length}</strong><span>presentes confirmados</span></div>
            <div><strong>{availableCount}</strong><span>presentes disponíveis</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <a className="hero-project-image" href="/projeto" aria-label="Conhecer o projeto do nosso novo lar">
            <img src={config.heroImage} alt={config.heroImageAlt} loading="lazy" decoding="async" />
          </a>
          <a className="hero-note" href="/projeto"><Heart size={17} fill="currentColor" /> Nosso projeto tomando forma <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section className="catalog-section" id="presentes">
        <div className="catalog-intro">
          <p className="eyebrow">Presentes para o nosso novo lar</p>
          <h2>Lista de presentes</h2>
          <p className="catalog-intro-text">Você escolhe, compra diretamente na loja e confirma aqui no final.</p>
          <div className="catalog-steps" role="list" aria-label="Como presentear">
            <div role="listitem"><span>1</span><p><strong>Escolha</strong><small>Abra o presente que preferir</small></p></div>
            <div role="listitem"><span>2</span><p><strong>Compre na loja</strong><small>Pagamento e entrega são feitos por lá</small></p></div>
            <div className="catalog-step-important" role="listitem"><span>3</span><p><strong>Volte e confirme</strong><small>Assim ninguém compra o mesmo item</small></p></div>
          </div>
        </div>
        {availabilityLoading && <div className="catalog-loading-note" role="status" aria-live="polite"><LoaderCircle size={18} /><span>Verificando quais presentes ainda estão disponíveis...</span></div>}
        {catalogLoading && <p role="status">Carregando a lista atualizada de presentes…</p>}
        {catalogWarning && <p role="status">{catalogWarning}</p>}
        {serviceWarning && <div className="service-warning" role="alert"><p><strong>Disponibilidade temporariamente indisponível.</strong> {serviceWarning}</p></div>}
        <div className="catalog-toolbar">
          <label className="search-box"><Search size={19} /><span className="sr-only">Buscar presente</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar presente..." /></label>
          <Button type="button" variant="outline" className="mobile-filter-trigger" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={18} /> Filtrar presentes{(category !== "Todos" || priceRange !== "todos") && <span>•</span>}</Button>
          <div className="catalog-filters desktop-catalog-filters">
            <div className="catalog-select">
              <label id="category-label">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-labelledby="category-label"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="category-menu">
                  {categories.map((item) => <SelectItem key={item} value={item}>{item === "Todos" ? "Todas" : item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="catalog-select">
              <label id="price-label">Preço</label>
              <Select value={priceRange} onValueChange={(value) => setPriceRange(value as PriceRange)}>
                <SelectTrigger aria-labelledby="price-label"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="category-menu">
                  <SelectItem value="todos">Todos os valores</SelectItem>
                  <SelectItem value="ate-100">Até R$ 100</SelectItem>
                  <SelectItem value="101-250">R$ 101 a R$ 250</SelectItem>
                  <SelectItem value="251-500">R$ 251 a R$ 500</SelectItem>
                  <SelectItem value="acima-500">Acima de R$ 500</SelectItem>
                  <SelectItem value="a-definir">Valor a definir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent className="mobile-filter-dialog">
            <DialogHeader>
              <DialogTitle>Filtrar presentes</DialogTitle>
              <DialogDescription>Escolha uma categoria e uma faixa de preço.</DialogDescription>
            </DialogHeader>
            <div className="mobile-filter-group">
              <h3>Categoria</h3>
              <div className="mobile-filter-list">
                {categories.map((item) => <button type="button" key={item} className={category === item ? "is-selected" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}><span>{item === "Todos" ? "Todas as categorias" : item}</span>{category === item && <Check size={18} />}</button>)}
              </div>
            </div>
            <div className="mobile-filter-group">
              <h3>Preço</h3>
              <div className="mobile-filter-list">
                {([
                  ["todos", "Todos os valores"], ["ate-100", "Até R$ 100"], ["101-250", "R$ 101 a R$ 250"],
                  ["251-500", "R$ 251 a R$ 500"], ["acima-500", "Acima de R$ 500"], ["a-definir", "Valor a definir"],
                ] as Array<[PriceRange, string]>).map(([value, label]) => <button type="button" key={value} className={priceRange === value ? "is-selected" : ""} aria-pressed={priceRange === value} onClick={() => setPriceRange(value)}><span>{label}</span>{priceRange === value && <Check size={18} />}</button>)}
              </div>
            </div>
            <div className="mobile-filter-actions">
              <Button type="button" variant="outline" onClick={() => { setCategory("Todos"); setPriceRange("todos"); }}>Limpar filtros</Button>
              <Button type="button" className="main-button" onClick={() => setFiltersOpen(false)}>Ver {filteredGifts.length} presentes</Button>
            </div>
          </DialogContent>
        </Dialog>
        <div className="gift-grid" aria-busy={availabilityLoading}>
          {filteredGifts.map((gift) => {
            const Icon = categoryIcons[gift.category] ?? GiftIcon;
            const isPurchased = purchased.has(gift.id);
            const unavailable = isPurchased || availabilityLoading || Boolean(serviceWarning);
            const openGift = () => {
              if (!unavailable) setSelectedGift(gift);
            };
            return <article className={`gift-card ${isPurchased ? "reserved" : ""} ${unavailable ? "is-unavailable" : "is-clickable"}`} key={gift.id} onClick={openGift}>
              <GiftArtwork key={`${gift.id}:${gift.url ?? ""}:${gift.image ?? ""}`} gift={gift} Icon={Icon} />
              <div className="gift-card-body">{gift.priority === "alta" && <span className="priority"><Heart size={12} fill="currentColor" /> Queremos muito</span>}<p className="gift-category">{gift.category}</p><h3>{gift.name}</h3>{gift.note && <p className="gift-note">{gift.note}</p>}
                <div className="gift-card-footer"><div><span className="price-label">Valor de referência</span><strong>{gift.price ? money.format(gift.price) : "A definir"}</strong></div>
                  <Button disabled={unavailable} onClick={(event) => { event.stopPropagation(); openGift(); }} className="gift-button" aria-label={isPurchased ? `${gift.name} já foi presenteado` : `Ver ${gift.name}`}>
                    {isPurchased ? <><Check /> Presenteado</> : availabilityLoading ? "Verificando..." : <>Ver presente <ExternalLink /></>}
                  </Button>
                </div>
              </div>
            </article>;
          })}
        </div>
        {!catalogLoading && !catalogWarning && filteredGifts.length === 0 && <div className="empty-state"><Search /><h3>Nenhum presente encontrado</h3><p>Tente outra busca ou ajuste os filtros.</p></div>}
      </section>

      <section className="pix-section" id="pix">
        <div className="pix-copy">
          <p className="eyebrow">Uma contribuição do seu jeito</p><h2>Contribua para o nosso novo lar</h2>
          <p>Se preferir, escolha um valor e gere o Pix. Você poderá pagar pelo QR Code ou pelo código copia e cola.</p>
        </div>
        <div className="pix-card">
          {!pixResult ? <form onSubmit={generatePix} className="pix-form">
            <div className="pix-form-heading"><div className="pix-icon"><Heart fill="currentColor" /></div><div><span>Contribuição via Pix</span><h3>Escolha um valor</h3></div></div>
            <p className="pix-form-intro">Digite qualquer valor ou use uma das sugestões.</p>
            <label>Valor da contribuição <span>(R$)</span><Input required inputMode="decimal" value={pixAmount} onChange={(event) => setPixAmount(event.target.value)} placeholder="Digite o valor desejado aqui" /></label>
            <div className="suggested-values light" aria-label="Valores sugeridos">{config.suggestedPixValues.map((value) => <button type="button" key={value} onClick={() => setPixAmount(String(value))}>{money.format(value)}</button>)}</div>
            <Button type="submit" disabled={pixLoading || !pixReady} className="main-button">{pixLoading ? "Gerando..." : pixReady ? "Gerar Pix" : "Pix em configuração"}</Button>
            {pixReady && pixReceiver && <div className="pix-security-notice"><Check size={18} /><p><strong>Pagamento seguro</strong><span>Antes de concluir, confirme no banco o favorecido <b>{pixReceiver}</b>.</span></p></div>}
          </form> : <div className="pix-result">
            <p className="eyebrow">Pix gerado com segurança</p><h3>{money.format(pixResult.amount)}</h3>
            <div className="receiver-check"><span>Favorecido</span><strong>{pixResult.receiver}</strong><small>Confirme este nome no aplicativo do seu banco.</small></div>
            <div className="pix-copy-paste">
              <strong>Pix copia e cola</strong>
              <small>Copie o código abaixo e cole na área Pix do aplicativo do seu banco.</small>
              <code>{pixResult.pixCopyPaste}</code>
              <Button type="button" onClick={copyPix} className="main-button"><Copy /> Copiar Pix copia e cola</Button>
            </div>
            {pixQrCode && <div className="pix-qr-code"><img src={pixQrCode} alt={`QR Code Pix no valor de ${money.format(pixResult.amount)}`} /><strong>Ou escaneie pelo aplicativo do seu banco</strong><small>O QR Code contém o mesmo valor e favorecido do Pix copia e cola.</small></div>}
            <form onSubmit={confirmPix} className="pix-confirm-form">
              <h4>Depois de enviar</h4>
              <label>Seu nome<Input required minLength={2} maxLength={80} value={pixGuestName} onChange={(event) => setPixGuestName(event.target.value)} /></label>
              <label>WhatsApp ou e-mail <span>(opcional)</span><Input maxLength={120} value={pixGuestContact} onChange={(event) => setPixGuestContact(event.target.value)} /></label>
              <label>Mensagem <span>(opcional)</span><Textarea maxLength={400} value={pixMessage} onChange={(event) => setPixMessage(event.target.value)} /></label>
              <div className="confirmation-row"><Checkbox id="pix-confirmed" checked={pixConfirmed} onCheckedChange={(value) => setPixConfirmed(value === true)} /><label htmlFor="pix-confirmed">Confirmo que já enviei o Pix pelo meu banco.</label></div>
              <Button type="submit" disabled={submitting || !pixConfirmed} className="main-button">{submitting ? "Registrando..." : "Confirmar envio do Pix"}</Button>
            </form>
          </div>}
        </div>
      </section>

      <footer><div className="footer-heart"><Heart fill="currentColor" /></div><p>Obrigado por fazer parte do começo da nossa casa.</p><small>{config.coupleNames}</small><a className="admin-lock-link" href="/admin" aria-label="Acessar área administrativa" title="Área administrativa"><Lock size={14} /></a></footer>

      <Dialog open={welcomeOpen} onOpenChange={(open) => open ? setWelcomeOpen(true) : closeWelcome()}>
        <DialogContent className="welcome-dialog">
          <div className="welcome-layout">
            <figure className="welcome-portrait">
              <img src={config.couplePhoto} alt={config.couplePhotoAlt} loading="eager" decoding="async" fetchPriority="high" />
              <figcaption>{config.coupleNames}</figcaption>
            </figure>
            <div className="welcome-content">
              <DialogHeader>
                <p className="eyebrow">Nosso chá de casa nova</p>
                <DialogTitle>Bem-vindos ao nosso cantinho</DialogTitle>
                <DialogDescription>Escolha um presente para a nossa casa ou contribua pelo Pix com o valor que desejar.</DialogDescription>
              </DialogHeader>
              <div className="welcome-next">
            <div className="welcome-actions">
              <Button asChild className="main-button"><a href="#presentes" onClick={closeWelcome}><GiftIcon /> Escolher um presente</a></Button>
              <Button asChild className="welcome-pix-button"><a href="#pix" onClick={closeWelcome}><Heart /> Contribuir com Pix</a></Button>
            </div>
                <a className="welcome-photos-link" href="/fotos" onClick={closeWelcome}>Conhecer nossa história em fotos <span aria-hidden="true">→</span></a>
              </div>
              <div className="welcome-reminder" role="note"><Check size={18} /><p><strong>Comprou na loja?</strong> Volte ao site e confirme o presente para evitar itens repetidos.</p></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedGift)} onOpenChange={(open) => !open && resetGiftForm()}>
        <DialogContent className="reservation-dialog">
          <DialogHeader><DialogTitle>{selectedGift?.name}</DialogTitle><DialogDescription>Primeiro escolha a entrega. Depois, compre na loja e volte aqui para confirmar.</DialogDescription></DialogHeader>
          <section className="delivery-step" aria-labelledby="delivery-step-title">
            <div className="delivery-step-heading"><span>1</span><p><strong id="delivery-step-title">Como o presente será entregue?</strong></p></div>
            <RadioGroup className="delivery-choice-grid" value={deliveryChoice} onValueChange={setDeliveryChoice} aria-label="Forma de entrega do presente" required>
              <label className={`delivery-choice-card ${deliveryChoice === "casal" ? "is-selected" : ""}`}>
                <RadioGroupItem value="casal" />
                <MapPin aria-hidden="true" />
                <span><strong>Vou enviar para o endereço do casal</strong></span>
              </label>
              <label className={`delivery-choice-card ${deliveryChoice === "convidado" ? "is-selected" : ""}`}>
                <RadioGroupItem value="convidado" />
                <HandHeart aria-hidden="true" />
                <span><strong>Vou entregar no dia do chá de panela</strong></span>
              </label>
            </RadioGroup>
            {deliveryChoice === "casal" && <div className="delivery-address" role="note">
              <MapPin size={18} aria-hidden="true" />
              <p><span>Endereço para entrega</span><strong>SHIS QL 20, Conjunto 02, Casa 14</strong><small>Lago Sul · CEP 71650-125</small></p>
              <Button type="button" variant="outline" onClick={copyDeliveryAddress} className="copy-address-button"><Copy /> Copiar</Button>
            </div>}
            {deliveryChoice && <p className="delivery-selection-next"><Check size={17} aria-hidden="true" /><span><strong>Forma de entrega escolhida.</strong> Agora siga com a compra no site da loja.</span></p>}
          </section>
          <div className="purchase-steps"><span>2</span><p><strong>Compre no site da loja</strong>O pagamento e a entrega são combinados diretamente com a loja.</p></div>
          {selectedGift?.url && deliveryChoice
            ? <Button asChild className="store-button"><a href={selectedGift.url} target="_blank" rel="noopener noreferrer" onClick={() => { setStoreOpened(true); setShowConfirmation(true); }}>Continuar para o site da loja <ExternalLink /></a></Button>
            : <Button type="button" className="store-button" disabled>{selectedGift?.url ? "Escolha a forma de entrega" : "Link da loja indisponível"}</Button>}
          <div className="return-confirmation-callout" role="note"><span>3</span><p><strong>Depois da compra, volte a este site</strong>O presente só ficará indisponível após você confirmar aqui. Isso evita que outra pessoa compre o mesmo item.</p></div>
          {!showConfirmation && <Button type="button" className="already-bought-button" disabled={!deliveryChoice} onClick={() => setShowConfirmation(true)}><Check /> Já comprei — confirmar presente</Button>}
          {showConfirmation && <form onSubmit={confirmGiftPurchase} className="reservation-form">
            <h3>Confirme sua compra</h3>
            <label>Seu nome<Input required minLength={2} maxLength={80} value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Como podemos identificar você?" /></label>
            <label>WhatsApp ou e-mail <span>(opcional)</span><Input maxLength={120} value={guestContact} onChange={(event) => setGuestContact(event.target.value)} /></label>
            <div className="delivery-confirmation-summary"><Check size={17} /><p><span>Forma de entrega</span><strong>{deliveryChoice === "casal" ? "Envio para o endereço do casal" : "Entrega no dia do chá de panela"}</strong></p></div>
            <label>Número do pedido <span>(opcional)</span><Input maxLength={120} value={orderReference} onChange={(event) => setOrderReference(event.target.value)} /></label>
            <label>Mensagem <span>(opcional)</span><Textarea maxLength={400} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
            <div className="confirmation-row"><Checkbox id="purchase-confirmed" checked={purchaseConfirmed} onCheckedChange={(value) => setPurchaseConfirmed(value === true)} /><label htmlFor="purchase-confirmed">Confirmo que já finalizei a compra deste presente na loja.</label></div>
            <input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
            <DialogFooter><Button type="button" variant="outline" onClick={resetGiftForm}>Voltar</Button><Button type="submit" disabled={submitting || !purchaseConfirmed || !deliveryChoice} className="main-button">{submitting ? "Confirmando..." : "Confirmar presente comprado"}</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
