"use client";

// Botón de eliminar con confirmación nativa — para acciones destructivas de
// /admin que no la tenían (ej. moderación de publicaciones de usuarias).
export default function BotonEliminarConfirmado({
  mensaje,
  className = "font-medium text-alerta",
  children = "Eliminar",
}: {
  mensaje: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
