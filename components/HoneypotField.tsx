import { HONEYPOT_FIELD } from "@/utils/antispam";

// Campo isca: invisível e fora do fluxo de tab/preenchimento humano. Bots
// que preenchem todos os inputs caem nele e o server descarta o envio.
// Sem "use client": é só markup, serve em Server e Client Components.
export default function HoneypotField() {
  return (
    <div aria-hidden="true" className="hidden">
      <label htmlFor={HONEYPOT_FIELD}>Não preencha este campo</label>
      <input
        type="text"
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}
