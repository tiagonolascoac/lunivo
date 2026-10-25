import React from "react";
import "./AlbumCanvas.css";

export const ALBUM_FONTS = {
  playfair: { label: "Playfair · Editorial", family: '"Playfair Display", Georgia, serif' },
  cormorant: { label: "Cormorant · Romântico", family: '"Cormorant Garamond", Georgia, serif' },
  sans: { label: "Manrope · Contemporâneo", family: '"Manrope", Arial, sans-serif' },
};

export function AlbumCover({ album, photos, onOpen, small = false }) {
  const cover = photos.find((photo) => photo.id === album.coverPhotoId) || photos[0];
  return <section className={`album-cover ${small ? "album-cover-small" : ""}`}
    style={{ "--album-theme": album.themeColor, "--album-accent": album.accentColor,
      "--album-font": ALBUM_FONTS[album.font]?.family || ALBUM_FONTS.playfair.family }}>
    {cover?.url && <img src={cover.url} alt="Capa do álbum" />}
    <div className="album-cover-shade" />
    <div className="album-cover-content">
      <div className="album-cover-kicker">LUNIVO · ÁLBUM PRIVADO</div>
      <h1>{album.title || "Nossa história em imagens"}</h1>
      <p>{album.subtitle || "Um capítulo para guardar para sempre"}</p>
      <span className="album-cover-rule" />
    </div>
    {onOpen && cover && <button type="button" className="album-cover-view" onClick={() => onOpen(cover)}>
      Visualizar capa ↗
    </button>}
  </section>;
}

export function AlbumMosaic({ photos, onOpen, renderControls }) {
  return <div className="album-mosaic">
    {photos.map((photo) => <article key={photo.id}
      className={`album-tile album-tile-${["wide", "portrait", "square", "full"].includes(photo.layout) ? photo.layout : "square"}`}>
      <button type="button" className="album-tile-photo" onClick={() => onOpen?.(photo)}
        aria-label={`Ampliar ${photo.fileName || "fotografia"}`}>
        {photo.url ? <img src={photo.url} alt={photo.fileName || "Fotografia"} loading="lazy" /> : <span>Carregando fotografia…</span>}
      </button>
      {renderControls?.(photo)}
    </article>)}
  </div>;
}
