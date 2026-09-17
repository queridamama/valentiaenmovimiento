// Biblioteca solo linkea afuera para video ("Ver el video →"); acá hace
// falta embeber de verdad porque la experiencia es parte del recorrido,
// no algo que abandone la app. YouTube/Vimeo no sirven con <video src>
// (esa etiqueta espera un archivo reproducible directo, no la página del
// player) — de ahí el iframe embed para cada proveedor.
function idYouTube(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/i);
  return m ? m[1] : null;
}

function idVimeo(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : null;
}

export default function ReproductorVideo({ url }: { url: string }) {
  const youtube = idYouTube(url);
  const vimeo = !youtube ? idVimeo(url) : null;

  if (youtube) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-card bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtube}`}
          title="Video de YouTube"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeo) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-card bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vimeo}`}
          title="Video de Vimeo"
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Archivo de video directo (mp4, etc.) — el caso que ya funcionaba antes.
  return <video src={url} controls className="w-full rounded-card bg-black" />;
}
