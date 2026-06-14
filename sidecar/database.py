"""Persistencia local: cada sesión de debate y cada mensaje quedan en SQLite."""
from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)

from rutas import carpeta_datos

RUTA_DATOS = carpeta_datos()

engine = create_engine(
    f"sqlite:///{os.path.join(RUTA_DATOS, 'ronda.db')}",
    connect_args={"check_same_thread": False},
)
SesionDB = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class SesionDebate(Base):
    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), default="Sesión sin título")
    filtros_json: Mapped[str] = mapped_column(Text, default="{}")
    creada_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    mensajes = relationship(
        "MensajeDebate", back_populates="sesion", cascade="all, delete-orphan"
    )


class MensajeDebate(Base):
    __tablename__ = "mensajes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sesion_id: Mapped[int] = mapped_column(ForeignKey("sesiones.id"))
    agente: Mapped[str] = mapped_column(String(40))
    etiqueta: Mapped[str] = mapped_column(String(80))
    contenido: Mapped[str] = mapped_column(Text)
    mermaid: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sesion = relationship("SesionDebate", back_populates="mensajes")


def iniciar_db() -> None:
    Base.metadata.create_all(engine)


def guardar_mensaje(
    sesion_id: int,
    agente: str,
    etiqueta: str,
    contenido: str,
    mermaid: Optional[str] = None,
) -> None:
    """Guardado automático de cada intervención del debate."""
    with SesionDB() as db:
        db.add(
            MensajeDebate(
                sesion_id=sesion_id,
                agente=agente,
                etiqueta=etiqueta,
                contenido=contenido,
                mermaid=mermaid,
            )
        )
        db.commit()
