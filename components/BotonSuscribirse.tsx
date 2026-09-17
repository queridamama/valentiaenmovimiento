"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { iniciarSuscripcion } from "@/lib/acciones/membresia";
import { PREMIUM_PLAN, formatearPrecio } from "@/lib/config/premium";

// @mercadopago/sdk-js no exporta tipos de `cardForm` (su .d.ts solo tipa
// `loadMercadoPago`, ver node_modules/@mercadopago/sdk-js/dist/index.d.ts)
// — se tipa acá, acotado a lo que realmente se usa, en vez de inventar un
// tipado completo del SDK.
interface DatosFormularioTarjeta {
  token: string;
}
interface InstanciaCardForm {
  getCardFormData: () => DatosFormularioTarjeta;
}
interface CampoCardForm {
  id: string;
  placeholder?: string;
}
interface InstanciaMercadoPago {
  cardForm: (config: {
    amount: string;
    iframe: boolean;
    form: {
      id: string;
      cardNumber: CampoCardForm;
      expirationDate: CampoCardForm;
      securityCode: CampoCardForm;
      cardholderName: CampoCardForm;
      issuer: CampoCardForm;
      installments: CampoCardForm;
      identificationType: CampoCardForm;
      identificationNumber: CampoCardForm;
      cardholderEmail: CampoCardForm;
    };
    callbacks: {
      onFormMounted: (error?: unknown) => void;
      onSubmit: (event: Event) => void;
    };
  }) => InstanciaCardForm;
}
declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale?: string }) => InstanciaMercadoPago;
  }
}

const ID_FORM = "form-suscripcion-premium";
const clasesCampo =
  "flex h-[46px] items-center rounded-[14px] border border-texto/12 bg-tarjeta px-4 text-[15px]";
const clasesInput =
  "h-[46px] rounded-[14px] border border-texto/12 bg-tarjeta px-4 text-[15px] placeholder:text-texto/35 focus:border-marca focus:outline-none";

// CTA de compra de /membresia: arranca mostrando solo el botón; al
// tocarlo, carga el SDK de Mercado Pago y monta su Card Form. Los campos
// sensibles (número de tarjeta, vencimiento, CVV) quedan DENTRO de
// iframes que sirve Mercado Pago (`iframe: true`) — ni siquiera nuestro
// JS los toca, mucho menos nuestro backend. Al confirmar, lo único que
// viaja a nuestra Server Action es el `token` efímero que ya generó
// Mercado Pago (card_token_id) — nunca un número de tarjeta ni un CVV,
// y nunca se guarda en ningún lado (ver lib/acciones/membresia.ts).
export default function BotonSuscribirse({ email }: { email: string }) {
  const router = useRouter();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargandoSdk, setCargandoSdk] = useState(false);
  const [formularioListo, setFormularioListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inicializado = useRef(false);

  // El <form> tiene que existir en el DOM antes de llamar a
  // mp.cardForm() (se vincula a los ids sincrónicamente) — por eso este
  // ref se usa para inicializar recién cuando React ya montó ese JSX, en
  // vez de un useEffect con dependencia en `mostrarFormulario` que
  // podría correr con el form todavía sin pintar. useCallback con []
  // para que sea la MISMA función en cada render: un ref-callback nuevo
  // en cada render hace que React lo dispare de nuevo con `null` y
  // después con el elemento, aunque `inicializado` ya lo frene.
  const montarFormularioTarjeta = useCallback((formEl: HTMLFormElement | null) => {
    if (!formEl || inicializado.current) return;
    inicializado.current = true;
    setCargandoSdk(true);

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (!publicKey) {
      setCargandoSdk(false);
      setError("Falta configurar Mercado Pago. Avisale a soporte.");
      return;
    }

    loadMercadoPago()
      .then(() => {
        const mp = new window.MercadoPago(publicKey, { locale: "es-AR" });

        const cardForm = mp.cardForm({
          amount: String(PREMIUM_PLAN.price),
          iframe: true,
          form: {
            id: ID_FORM,
            cardNumber: { id: `${ID_FORM}__cardNumber`, placeholder: "Número de tarjeta" },
            expirationDate: { id: `${ID_FORM}__expirationDate`, placeholder: "MM/AA" },
            securityCode: { id: `${ID_FORM}__securityCode`, placeholder: "CVV" },
            cardholderName: { id: `${ID_FORM}__cardholderName`, placeholder: "Nombre igual que en la tarjeta" },
            issuer: { id: `${ID_FORM}__issuer` },
            installments: { id: `${ID_FORM}__installments` },
            identificationType: { id: `${ID_FORM}__identificationType` },
            identificationNumber: { id: `${ID_FORM}__identificationNumber`, placeholder: "Número de documento" },
            cardholderEmail: { id: `${ID_FORM}__cardholderEmail` },
          },
          callbacks: {
            onFormMounted: (errorMontaje) => {
              setCargandoSdk(false);
              if (errorMontaje) {
                console.error("[mercadopago] error montando el formulario de tarjeta", errorMontaje);
                setError("No pudimos cargar el formulario de pago. Recargá la página e intentá de nuevo.");
                return;
              }
              setFormularioListo(true);
            },
            onSubmit: (event) => {
              event.preventDefault();
              setError(null);
              setEnviando(true);

              const { token } = cardForm.getCardFormData();
              if (!token) {
                setEnviando(false);
                setError("No pudimos validar los datos de la tarjeta. Revisalos e intentá de nuevo.");
                return;
              }

              iniciarSuscripcion(token)
                .then((resultado) => {
                  if ("error" in resultado) {
                    setEnviando(false);
                    setError(resultado.error);
                    return;
                  }
                  router.push("/membresia/resultado");
                })
                .catch(() => {
                  setEnviando(false);
                  setError("No pudimos procesar el pago. Probá de nuevo en unos minutos.");
                });
            },
          },
        });
      })
      .catch(() => {
        setCargandoSdk(false);
        setError("No pudimos cargar Mercado Pago. Revisá tu conexión e intentá de nuevo.");
      });
  }, [router]);

  if (!mostrarFormulario) {
    return (
      <button
        type="button"
        onClick={() => setMostrarFormulario(true)}
        className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white transition active:scale-[0.98]"
      >
        Sumarme a Premium
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-[24px] bg-white p-5">
      {cargandoSdk && <p className="text-center text-[13px] text-texto/50">Cargando el formulario seguro de pago…</p>}

      <form id={ID_FORM} ref={montarFormularioTarjeta} className="space-y-3">
        <div id={`${ID_FORM}__cardNumber`} className={clasesCampo} />
        <div className="grid grid-cols-2 gap-3">
          <div id={`${ID_FORM}__expirationDate`} className={clasesCampo} />
          <div id={`${ID_FORM}__securityCode`} className={clasesCampo} />
        </div>
        <input id={`${ID_FORM}__cardholderName`} className={clasesInput} placeholder="Nombre igual que en la tarjeta" />
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <select id={`${ID_FORM}__identificationType`} className={clasesInput} />
          <input id={`${ID_FORM}__identificationNumber`} className={clasesInput} placeholder="Número de documento" />
        </div>
        {/* issuer/installments: Mercado Pago los completa solo a partir
            del número de tarjeta (BIN) — una suscripción mensual siempre
            es 1 cuota, así que no hace falta mostrárselos a la usuaria. */}
        <select id={`${ID_FORM}__issuer`} className="hidden" />
        <select id={`${ID_FORM}__installments`} className="hidden" />
        <input id={`${ID_FORM}__cardholderEmail`} type="email" defaultValue={email} className="hidden" readOnly />

        <button
          type="submit"
          disabled={enviando || !formularioListo}
          className="block w-full rounded-full bg-marca px-6 py-4 text-center text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {enviando ? "Procesando pago…" : `Confirmar suscripción — ${formatearPrecio(PREMIUM_PLAN.price)}/mes`}
        </button>
      </form>

      {error && <p className="text-center text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
