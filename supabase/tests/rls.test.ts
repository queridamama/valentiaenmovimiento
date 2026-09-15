/**
 * Verificación reproducible de permisos (RLS) — Fase 0/1.
 *
 * Corre escenarios de ataque concretos contra un proyecto Supabase REAL
 * (o local vía `supabase start`), directo a la API — sin pasar por la UI
 * de la app — para confirmar que la base de datos es la barrera de
 * seguridad, no el frontend.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY              (solo para setup/cleanup, nunca se
 *                                      usa para los intentos que se testean)
 *
 * Correr con: npm run test:rls
 *
 * IMPORTANTE: esto no se pudo ejecutar en esta conversación porque el
 * entorno donde se generó el código no tiene acceso a internet ni a un
 * proyecto Supabase real. Ver STATUS.md.
 */
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
  console.error(
    "Faltan variables de entorno. Revisá .env.local (ver .env.example)."
  );
  process.exit(1);
}

const admin = createClient(URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Perfil = { email: string; password: string; nivel: "gratis" | "premium"; rol: "miembro" | "editor" | "admin" };

const PERFILES: Record<string, Perfil> = {
  gratis: { email: `test-gratis-${Date.now()}@valentia.test`, password: "Test1234!", nivel: "gratis", rol: "miembro" },
  premium: { email: `test-premium-${Date.now()}@valentia.test`, password: "Test1234!", nivel: "premium", rol: "miembro" },
  editor: { email: `test-editor-${Date.now()}@valentia.test`, password: "Test1234!", nivel: "gratis", rol: "editor" },
  admin: { email: `test-admin-${Date.now()}@valentia.test`, password: "Test1234!", nivel: "gratis", rol: "admin" },
};

let fallos = 0;
function assert(condicion: boolean, mensaje: string) {
  if (condicion) {
    console.log(`  ✅ ${mensaje}`);
  } else {
    console.error(`  ❌ ${mensaje}`);
    fallos++;
  }
}

async function crearUsuarioDePrueba(perfil: Perfil) {
  const { data, error } = await admin.auth.admin.createUser({
    email: perfil.email,
    password: perfil.password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No se pudo crear el usuario de prueba");

  // El trigger on_auth_user_created ya creó perfiles/autorizaciones con
  // los valores por defecto; acá los ajustamos con el service role
  // (bypassea RLS por diseño — es exactamente el único camino legítimo
  // para cambiar nivel/rol fuera del panel de admin).
  await admin.from("autorizaciones").update({ nivel: perfil.nivel, rol: perfil.rol }).eq("usuario_id", data.user.id);

  return data.user.id;
}

async function clienteLogueadoComo(perfil: Perfil): Promise<SupabaseClient> {
  const cliente = createClient(URL, PUBLISHABLE_KEY);
  const { error } = await cliente.auth.signInWithPassword({ email: perfil.email, password: perfil.password });
  if (error) throw error;
  return cliente;
}

async function limpiarUsuario(id: string) {
  await admin.auth.admin.deleteUser(id);
}

async function main() {
  console.log("Creando usuarias de prueba…");
  const ids: Record<string, string> = {};
  for (const [key, perfil] of Object.entries(PERFILES)) {
    ids[key] = await crearUsuarioDePrueba(perfil);
  }

  const clienteGratis = await clienteLogueadoComo(PERFILES.gratis);
  const clientePremium = await clienteLogueadoComo(PERFILES.premium);
  const clienteAnonimo = createClient(URL, PUBLISHABLE_KEY);

  console.log("\n1) Anónima no puede leer datos protegidos");
  {
    const { data } = await clienteAnonimo.from("suenos").select("*");
    assert((data ?? []).length === 0, "anónima no ve filas de `suenos`");
  }

  console.log("\n2) Gratuita no puede leer contenido de membresía");
  {
    // Sembramos, con service role, un curso de membresía publicado y su
    // contenido, y verificamos que la gratuita no lo vea.
    const { data: curso } = await admin
      .from("cursos")
      .insert({ titulo: "Curso premium de prueba", nivel_acceso: "membresia", estado: "publicado" })
      .select()
      .single();
    const { data: contenidoRow } = await admin
      .from("contenidos")
      .insert({ tipo: "clase", titulo: "Clase premium de prueba", estado: "publicado" })
      .select()
      .single();
    const { data: modulo } = await admin
      .from("modulos")
      .insert({ curso_id: curso!.id, titulo: "Módulo 1" })
      .select()
      .single();
    await admin.from("contenido_ubicaciones").insert({
      contenido_id: contenidoRow!.id,
      contexto: "modulo",
      modulo_id: modulo!.id,
    });

    const { data: vistoPorGratis } = await clienteGratis.from("cursos").select("*").eq("id", curso!.id);
    assert((vistoPorGratis ?? []).length === 0, "gratuita no ve el curso de membresía");

    const { data: vistoPorPremium } = await clientePremium.from("cursos").select("*").eq("id", curso!.id);
    assert((vistoPorPremium ?? []).length === 1, "premium sí ve el curso de membresía");
  }

  console.log('\n3) Gratuita no puede leer "Necesito destrabar"');
  {
    const { data: categoria } = await admin
      .from("categorias_comunidad")
      .select("id")
      .eq("nombre", "Necesito destrabar")
      .single();
    const { data: publicacion } = await admin
      .from("publicaciones_comunidad")
      .insert({ usuario_id: ids.premium, categoria_id: categoria!.id, contenido: "Post de prueba premium" })
      .select()
      .single();

    const { data: vistoPorGratis } = await clienteGratis
      .from("publicaciones_comunidad")
      .select("*")
      .eq("id", publicacion!.id);
    assert((vistoPorGratis ?? []).length === 0, 'gratuita no ve publicaciones de "Necesito destrabar"');
  }

  console.log("\n4) Una usuaria no puede cambiar su propio nivel");
  {
    const { error } = await clienteGratis
      .from("autorizaciones")
      .update({ nivel: "premium" })
      .eq("usuario_id", ids.gratis);
    const { data: verificacion } = await admin
      .from("autorizaciones")
      .select("nivel")
      .eq("usuario_id", ids.gratis)
      .single();
    assert(!!error || verificacion?.nivel === "gratis", "el intento de auto-ascenderse a premium no tuvo efecto");
  }

  console.log("\n5) Una usuaria no puede cambiar su propio rol");
  {
    await clienteGratis.from("autorizaciones").update({ rol: "admin" }).eq("usuario_id", ids.gratis);
    const { data: verificacion } = await admin
      .from("autorizaciones")
      .select("rol")
      .eq("usuario_id", ids.gratis)
      .single();
    assert(verificacion?.rol === "miembro", "el intento de auto-ascenderse a admin no tuvo efecto");
  }

  console.log("\n6) Una usuaria no puede acceder al sueño/proyecto de otra");
  {
    const { data: suenoAjeno } = await admin
      .from("suenos")
      .insert({ usuario_id: ids.premium, descripcion: "Sueño de otra usuaria" })
      .select()
      .single();

    const { data: vistoPorGratis } = await clienteGratis.from("suenos").select("*").eq("id", suenoAjeno!.id);
    assert((vistoPorGratis ?? []).length === 0, "gratuita no puede leer el sueño de otra usuaria");

    const { error: errorInsert } = await clienteGratis.from("movimientos_semanales").insert({
      usuario_id: ids.gratis,
      sueno_id: suenoAjeno!.id, // sueño de OTRA usuaria
      descripcion: "Intento de movimiento cruzado",
    });
    assert(!!errorInsert, "no se puede crear un movimiento propio apuntando al sueño de otra usuaria");
  }

  console.log("\n7) Proyecto pausado: la dueña no puede seguir editándolo");
  {
    const { data: sueno } = await admin
      .from("suenos")
      .insert({ usuario_id: ids.premium, descripcion: "Sueño para proyecto pausado", estado: "activo" })
      .select()
      .single();
    const { data: proyecto } = await admin
      .from("proyectos_valentia")
      .insert({ usuario_id: ids.premium, sueno_id: sueno!.id, estado: "pausado" })
      .select()
      .single();

    const { error: errorUpdate } = await clientePremium
      .from("proyectos_valentia")
      .update({ identidad_en_practica: "intento de edición" })
      .eq("id", proyecto!.id);
    const { data: verificacion } = await admin
      .from("proyectos_valentia")
      .select("identidad_en_practica")
      .eq("id", proyecto!.id)
      .single();
    assert(
      !!errorUpdate || verificacion?.identidad_en_practica === null,
      "no se puede editar un Proyecto pausado, ni siquiera la dueña"
    );

    const { data: lectura } = await clientePremium.from("proyectos_valentia").select("*").eq("id", proyecto!.id);
    assert((lectura ?? []).length === 1, "la dueña sí puede seguir LEYENDO su Proyecto pausado");
  }

  console.log("\n8) Una usuaria gratuita no puede crear un Proyecto de Valentía");
  {
    const { data: suenoGratis } = await admin
      .from("suenos")
      .insert({ usuario_id: ids.gratis, descripcion: "Sueño de la gratuita", estado: "activo" })
      .select()
      .single();

    const { error: errorInsert } = await clienteGratis.from("proyectos_valentia").insert({
      usuario_id: ids.gratis,
      sueno_id: suenoGratis!.id,
    });
    assert(!!errorInsert, "el intento de crear un Proyecto de Valentía siendo gratuita falla");

    const { data: verificacion } = await admin
      .from("proyectos_valentia")
      .select("id")
      .eq("usuario_id", ids.gratis);
    assert((verificacion ?? []).length === 0, "no quedó ningún Proyecto creado para la gratuita");
  }

  console.log("\n9) Contenido ubicado en una etapa: solo premium");
  {
    const { data: contenidoEtapa } = await admin
      .from("contenidos")
      .insert({ tipo: "clase", titulo: "Clase de etapa de prueba", estado: "publicado" })
      .select()
      .single();
    const { data: etapa } = await admin.from("etapas_ruta").select("id").eq("nombre", "DEFINÍ").single();
    await admin.from("contenido_ubicaciones").insert({
      contenido_id: contenidoEtapa!.id,
      contexto: "etapa",
      etapa_id: etapa!.id,
    });

    const { data: vistoPorGratis } = await clienteGratis.from("contenidos").select("*").eq("id", contenidoEtapa!.id);
    assert((vistoPorGratis ?? []).length === 0, "gratuita no puede leer contenido ubicado en una etapa");

    const { data: vistoPorPremium } = await clientePremium.from("contenidos").select("*").eq("id", contenidoEtapa!.id);
    assert((vistoPorPremium ?? []).length === 1, "premium sí puede leer contenido ubicado en una etapa");
  }

  console.log("\n10) Contenido publicado sin ninguna ubicación no se vuelve público por accidente");
  {
    const { data: contenidoSuelto } = await admin
      .from("contenidos")
      .insert({ tipo: "recurso", titulo: "Recurso publicado sin ubicar", estado: "publicado" })
      .select()
      .single();

    const { data: vistoPorGratis } = await clienteGratis.from("contenidos").select("*").eq("id", contenidoSuelto!.id);
    assert((vistoPorGratis ?? []).length === 0, "gratuita no ve contenido publicado sin ubicación");

    const { data: vistoPorPremium } = await clientePremium.from("contenidos").select("*").eq("id", contenidoSuelto!.id);
    assert((vistoPorPremium ?? []).length === 0, "premium tampoco ve contenido publicado sin ubicación");
  }

  console.log("\n11) Un curso gratuito sí expone sus contenidos a una gratuita");
  {
    const { data: cursoGratis } = await admin
      .from("cursos")
      .insert({ titulo: "Mini curso de prueba", nivel_acceso: "gratis", estado: "publicado" })
      .select()
      .single();
    const { data: moduloGratis } = await admin
      .from("modulos")
      .insert({ curso_id: cursoGratis!.id, titulo: "Módulo único" })
      .select()
      .single();
    const { data: contenidoGratis } = await admin
      .from("contenidos")
      .insert({ tipo: "clase", titulo: "Clase 1 del mini curso", estado: "publicado" })
      .select()
      .single();
    await admin.from("contenido_ubicaciones").insert({
      contenido_id: contenidoGratis!.id,
      contexto: "modulo",
      modulo_id: moduloGratis!.id,
    });

    const { data: vistoPorGratis } = await clienteGratis.from("contenidos").select("*").eq("id", contenidoGratis!.id);
    assert((vistoPorGratis ?? []).length === 1, "gratuita sí ve el contenido de un curso gratuito");
  }

  console.log('\n12) Gratuita no puede reaccionar a una publicación de "Necesito destrabar"');
  {
    const { data: categoria } = await admin
      .from("categorias_comunidad")
      .select("id")
      .eq("nombre", "Necesito destrabar")
      .single();
    const { data: publicacion } = await admin
      .from("publicaciones_comunidad")
      .insert({ usuario_id: ids.premium, categoria_id: categoria!.id, contenido: "Otro post premium de prueba" })
      .select()
      .single();

    const { error: errorReaccion } = await clienteGratis.from("reacciones").insert({
      usuario_id: ids.gratis,
      publicacion_id: publicacion!.id,
      tipo: "corazon",
    });
    assert(!!errorReaccion, 'gratuita no puede reaccionar a una publicación de "Necesito destrabar"');
  }

  console.log("\nLimpiando usuarias de prueba…");
  for (const id of Object.values(ids)) {
    await limpiarUsuario(id);
  }

  console.log(fallos === 0 ? "\n✅ Todos los chequeos de permisos pasaron." : `\n❌ ${fallos} chequeo(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Error corriendo la verificación:", err);
  process.exit(1);
});
