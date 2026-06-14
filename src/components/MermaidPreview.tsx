import { useEffect, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    fontFamily: "inherit",
    primaryColor: "#becfee",
    primaryTextColor: "#16181d",
    lineColor: "#71717a",
  },
});

let contadorRender = 0;

export function MermaidPreview({ codigo }: { codigo: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    mermaid
      .render(`grafico-${++contadorRender}`, codigo)
      .then((resultado) => {
        if (activo) {
          setSvg(resultado.svg);
          setError(null);
        }
      })
      .catch(() => {
        if (activo) setError("El diagrama Mermaid recibido no es válido.");
      });
    return () => {
      activo = false;
    };
  }, [codigo]);

  if (error) {
    return <p className="p-4 text-xs text-red-400">{error}</p>;
  }

  return (
    <div
      className="vista-mermaid grid h-full w-full place-items-center overflow-auto p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
