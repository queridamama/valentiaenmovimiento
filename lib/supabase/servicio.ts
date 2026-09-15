import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la SECRET KEY (rol de servicio): bypassea RLS por completo.
// `import "server-only"` hace que el build FALLE si algo de esto termina
// importado, aunque sea de forma indirecta, en un componente cliente — no
// hay forma de que esta clave llegue al navegador por accidente.
//
// Se usa en un solo lugar con criterio: para firmar una URL temporal de un
// archivo en el bucket privado "medios-privados", y SIEMPRE después de
// haber comprobado el acceso real con el cliente normal (el que sí respeta
// RLS) — nunca como atajo para saltarse ese chequeo. Ver
// lib/acciones/almacenamiento.ts.
export function crearClienteServicio() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
