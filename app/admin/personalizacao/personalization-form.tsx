"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Home, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SiteConfig } from "@/types/gift";

const colors: Array<
  [keyof SiteConfig["theme"], string]
> = [
  ["background", "Fundo"],
  ["surface", "Cartões"],
  ["primary", "Cor principal"],
  ["primaryDark", "Principal escuro"],
  ["pixBackground", "Fundo do Pix"],
  ["accent", "Destaque"],
  ["text", "Texto"],
  ["mutedText", "Texto secundário"],
];

export function PersonalizationForm({
  initialConfig,
}: {
  initialConfig: SiteConfig;
}) {
  const [config, setConfig] =
    useState(initialConfig);
  const [pixValues, setPixValues] = useState(
    initialConfig.suggestedPixValues.join(", ")
  );
  const [saving, setSaving] = useState(false);

  function change<K extends keyof SiteConfig>(
    key: K,
    value: SiteConfig[K]
  ) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const suggestedPixValues = pixValues
        .split(/[;, ]+/)
        .map(Number)
        .filter(
          (value) =>
            Number.isFinite(value) && value > 0
        );

      const response = await fetch(
        "/api/admin/config",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            config: {
              ...config,
              suggestedPixValues,
            },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      const result = (await response.json()) as {
        config?: SiteConfig;
        error?: string;
      };

      if (!response.ok || !result.config) {
        throw new Error(
          result.error ??
            "Não foi possível salvar."
        );
      }

      setConfig(result.config);
      setPixValues(
        result.config.suggestedPixValues.join(", ")
      );

      toast.success(
        "Personalização salva. Recarregue o site para conferir."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Home size={18} />
          </span>
          <span>Nosso cantinho</span>
        </Link>

        <Button asChild variant="outline">
          <Link href="/admin">
            Voltar ao painel
          </Link>
        </Button>
      </header>

      <section className="admin-shell">
        <div className="admin-heading">
          <p className="eyebrow">Área privada</p>
          <h1>Personalização</h1>
          <p>
            Altere textos, data, endereço,
            planilha, valores sugeridos e cores.
            As alterações são salvas sem novo
            deploy.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="admin-config-form"
        >
          <div className="admin-config-grid">
            <label>
              Título do evento
              <Input
                value={config.eventTitle}
                onChange={(event) =>
                  change(
                    "eventTitle",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Nomes do casal
              <Input
                value={config.coupleNames}
                onChange={(event) =>
                  change(
                    "coupleNames",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Nome curto da marca
              <Input
                value={config.brandLabel}
                onChange={(event) =>
                  change(
                    "brandLabel",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Data do evento
              <Input
                type="date"
                value={config.eventDate ?? ""}
                onChange={(event) =>
                  change(
                    "eventDate",
                    event.target.value || null
                  )
                }
              />
            </label>

            <label className="wide">
              Frase de abertura
              <Input
                value={config.heroEyebrow}
                onChange={(event) =>
                  change(
                    "heroEyebrow",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="wide">
              Mensagem de boas-vindas
              <Textarea
                rows={5}
                value={config.welcomeMessage}
                onChange={(event) =>
                  change(
                    "welcomeMessage",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="wide">
              Endereço para entrega
              <Textarea
                rows={3}
                value={config.deliveryAddress}
                onChange={(event) =>
                  change(
                    "deliveryAddress",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="wide">
              Link CSV da planilha Google
              <Input
                value={config.giftSheetCsvUrl}
                onChange={(event) =>
                  change(
                    "giftSheetCsvUrl",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="wide">
              Valores sugeridos para Pix,
              separados por vírgula
              <Input
                value={pixValues}
                onChange={(event) =>
                  setPixValues(event.target.value)
                }
              />
            </label>
          </div>

          <div className="admin-color-section">
            <h2>Cores do site</h2>

            <div className="admin-color-grid">
              {colors.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <span>
                    <input
                      type="color"
                      value={config.theme[key]}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          theme: {
                            ...current.theme,
                            [key]:
                              event.target.value,
                          },
                        }))
                      }
                    />

                    <Input
                      value={config.theme[key]}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          theme: {
                            ...current.theme,
                            [key]:
                              event.target.value,
                          },
                        }))
                      }
                    />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={saving}
          >
            <Save />
            {saving
              ? "Salvando..."
              : "Salvar personalização"}
          </Button>
        </form>
      </section>
    </main>
  );
}
