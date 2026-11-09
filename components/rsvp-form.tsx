"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Person = { id: number; name: string; attending: "yes" | "no" };

export function RsvpForm() {
  const [people, setPeople] = useState<Person[]>([{ id: 1, name: "", attending: "yes" }]);
  const [nextId, setNextId] = useState(2);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function updatePerson(id: number, patch: Partial<Person>) {
    setPeople((current) => current.map((person) => person.id === id ? { ...person, ...patch } : person));
  }

  function addPerson() {
    if (people.length >= 20) {
      toast.error("O limite é de 20 pessoas por confirmação.");
      return;
    }
    setPeople((current) => [...current, { id: nextId, name: "", attending: "yes" }]);
    setNextId((current) => current + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (people.some((person) => person.name.trim().length < 2)) {
      toast.error("Informe o nome de cada pessoa.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/confirmations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ people: people.map(({ name, attending }) => ({ name: name.trim(), attending: attending === "yes" })) }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível registrar a confirmação.");
      setSent(true);
      toast.success("Presença registrada. Obrigado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a confirmação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rsvp-section" id="confirmacao">
      <div className="rsvp-copy">
        <p className="eyebrow">Vai estar com a gente?</p>
        <h2>Confirme sua presença</h2>
        <p>Conte se você vem e inclua quem vai acompanhar você.</p>
      </div>
      <div className="rsvp-card">
        {sent ? (
          <div className="rsvp-success" role="status"><Users size={28} /><h3>Confirmação recebida!</h3><p>Obrigado por avisar. Estamos esperando vocês.</p><Button type="button" variant="outline" onClick={() => { setPeople([{ id: nextId, name: "", attending: "yes" }]); setNextId((value) => value + 1); setSent(false); }}>Registrar outra confirmação</Button></div>
        ) : (
          <form onSubmit={submit} className="rsvp-form">
            {people.map((person, index) => (
              <fieldset className="rsvp-person" key={person.id}>
                <div className="rsvp-person-heading"><legend>{index === 0 ? "Seu nome" : `Acompanhante ${index}`}</legend>{index > 0 && <Button type="button" size="icon" variant="ghost" aria-label={`Remover acompanhante ${index}`} onClick={() => setPeople((current) => current.filter((item) => item.id !== person.id))}><Trash2 size={17} /></Button>}</div>
                <Input required minLength={2} maxLength={100} value={person.name} onChange={(event) => updatePerson(person.id, { name: event.target.value })} placeholder={index === 0 ? "Digite seu nome" : "Nome do acompanhante"} />
                <RadioGroup value={person.attending} onValueChange={(value) => updatePerson(person.id, { attending: value as "yes" | "no" })} className="rsvp-options" aria-label={`Presença de ${person.name || (index === 0 ? "você" : "acompanhante")}`}>
                  <label><RadioGroupItem value="yes" /> Vou</label>
                  <label><RadioGroupItem value="no" /> Não vou</label>
                </RadioGroup>
              </fieldset>
            ))}
            <Button type="button" variant="outline" className="rsvp-add-button" onClick={addPerson}><Plus size={17} /> Adicionar acompanhante</Button>
            <Button type="submit" className="main-button" disabled={sending}>{sending ? "Enviando..." : "Confirmar presença"}</Button>
          </form>
        )}
      </div>
    </section>
  );
}
