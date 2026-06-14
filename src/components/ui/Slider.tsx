interface PropsSlider {
  etiqueta: string;
  detalle: string;
  valor: number;
  min?: number;
  max?: number;
  onCambio: (valor: number) => void;
}

export function Slider({
  etiqueta,
  detalle,
  valor,
  min = 0,
  max = 100,
  onCambio,
}: PropsSlider) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-zinc-200">{etiqueta}</span>
        <span className="text-xs text-zinc-500">{detalle}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}
