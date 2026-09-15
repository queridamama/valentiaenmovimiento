"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

function BotonBarra({
  activo,
  onClick,
  children,
}: {
  activo?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${
        activo ? "bg-texto text-white" : "text-texto/60 hover:bg-texto/5"
      }`}
    >
      {children}
    </button>
  );
}

function BarraHerramientas({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap gap-1 border-b border-texto/10 p-2">
      <BotonBarra activo={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        Negrita
      </BotonBarra>
      <BotonBarra activo={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        Cursiva
      </BotonBarra>
      <BotonBarra
        activo={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        Título
      </BotonBarra>
      <BotonBarra activo={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        Lista
      </BotonBarra>
      <BotonBarra activo={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        Cita
      </BotonBarra>
    </div>
  );
}

// Guarda HTML en un <input type="hidden"> para que viaje con el resto del
// formulario (mismo patrón que CampoArchivo): la editora no ve nada de
// esto, solo escribe con formato.
export default function EditorEnriquecido({
  name,
  label,
  contenidoInicial = "",
}: {
  name: string;
  label?: string;
  contenidoInicial?: string;
}) {
  const [html, setHtml] = useState(contenidoInicial);

  const editor = useEditor({
    extensions: [StarterKit],
    content: contenidoInicial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "contenido-enriquecido min-h-[150px] px-3 py-2 focus:outline-none",
      },
    },
  });

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-texto/70">{label}</span>}
      <div className="rounded-lg border border-texto/15">
        <BarraHerramientas editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
