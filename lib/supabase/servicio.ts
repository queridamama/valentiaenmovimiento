import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la SECRET KEY (rol de servicio): bypassea RLS por completo.
// `import "server-only"` hace que el build FALLE si algo de esto termina
// importado, aunque sea de forma indirecta, en un componente cliente — no
// hay forma de que esta clave llegue al navegador por accidente.
//
// Se usa solo del lado servidor y en lugares donde el código vuelve a imponer
// explícitamente el límite de acceso: para firmar archivos privados después
// de comprobar RLS, y para leer el teaser público de /encuentros/[slug], que
// solo expone metadatos de contenidos publicados ubicados como Biblioteca Gratis.
// Nunca se devuelve la clave ni el cliente al navegador.
export function crearClienteServicio() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
