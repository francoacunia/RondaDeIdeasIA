"""Genera el ícono de la app (PNG RGBA) usando solo la librería estándar.

Dibuja un cuadrado azul pastel (#BECFEE) con un círculo oscuro al centro,
a juego con la tarjeta destacada del dashboard. Después el README/instalador
lo convierte a .icns con `sips` (herramienta incluida en macOS).
"""
import struct
import sys
import zlib

TAMANIO = 1024
FONDO = (190, 207, 238, 255)  # --color-accent
TINTA = (22, 24, 29, 255)     # --color-ink
CENTRO = TAMANIO / 2
RADIO = TAMANIO * 0.28


def _chunk(etiqueta: bytes, datos: bytes) -> bytes:
    return (
        struct.pack(">I", len(datos))
        + etiqueta
        + datos
        + struct.pack(">I", zlib.crc32(etiqueta + datos) & 0xFFFFFFFF)
    )


def generar(ruta: str) -> None:
    filas = bytearray()
    for y in range(TAMANIO):
        filas.append(0)  # filtro PNG "None"
        for x in range(TAMANIO):
            distancia = ((x - CENTRO) ** 2 + (y - CENTRO) ** 2) ** 0.5
            color = TINTA if distancia <= RADIO else FONDO
            filas.extend(color)

    ihdr = struct.pack(">IIBBBBB", TAMANIO, TAMANIO, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(bytes(filas), 9))
        + _chunk(b"IEND", b"")
    )
    with open(ruta, "wb") as archivo:
        archivo.write(png)
    print(f"Ícono generado: {ruta}")


if __name__ == "__main__":
    generar(sys.argv[1] if len(sys.argv) > 1 else "icon.png")
