"""Detección de código Mermaid.js dentro de las respuestas de los agentes."""
from __future__ import annotations

import re
from typing import Optional

_PATRON_MERMAID = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL | re.IGNORECASE)


def extraer_mermaid(texto: str) -> Optional[str]:
    """Devuelve el primer bloque ```mermaid``` encontrado, o None.

    El frontend usa este valor para renderizar el gráfico interactivo
    en la Tarjeta de Recursos.
    """
    coincidencia = _PATRON_MERMAID.search(texto or "")
    if not coincidencia:
        return None
    codigo = coincidencia.group(1).strip()
    return codigo or None
