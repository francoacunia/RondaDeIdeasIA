interface PropsToggle {
  activo: boolean;
  onCambio: (valor: boolean) => void;
  etiquetaAccesible: string;
}

export function Toggle({ activo, onCambio, etiquetaAccesible }: PropsToggle) {
  return (
    <button
      role="switch"
      aria-checked={activo}
      aria-label={etiquetaAccesible}
      onClick={() => onCambio(!activo)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        activo ? "bg-accent" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-zinc-950 transition-transform ${
          activo ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
