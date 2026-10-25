import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { getBlob, ref } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import { db, storage } from "../../services/firebase";
import { DEFAULT_ALBUM, isAlbumViewer, loadAlbumPhotos } from "../../services/albumService";
import { AlbumCover, AlbumMosaic } from "../../components/album/AlbumCanvas";
import { makePhotoZip } from "../../utils/browserZip";
import "./ClientAlbum.css";

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const safeFile = (text) => String(text || "album").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);

function ClientAlbum() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState(null);
  const [album, setAlbum] = useState(DEFAULT_ALBUM);
  const [photos, setPhotos] = useState([]);
  const previewUrls = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const jobSnap = await getDoc(doc(db, "privateJobs", jobId));
      if (!jobSnap.exists()) throw new Error("Álbum não encontrado.");
      const jobData = { id: jobSnap.id, ...jobSnap.data() };
      if (!isAlbumViewer(jobData, user)) throw new Error("Este álbum é exclusivo da conta cadastrada no trabalho.");
      if (!jobData.deliveryPublished) throw new Error("Este álbum ainda não foi entregue pela fotógrafa.");
      const ordered = await loadAlbumPhotos(jobId);
      // A visualização também passa pelas regras do Storage: sem URLs com token compartilhável.
      const full = [];
      for (let start = 0; start < ordered.length; start += 6) {
        const group = await Promise.all(ordered.slice(start, start + 6).map(async (photo) => {
          const preview = await getBlob(ref(storage, photo.previewStoragePath || photo.storagePath));
          const url = URL.createObjectURL(preview);
          previewUrls.current.push(url);
          return { ...photo, url };
        }));
        full.push(...group);
      }
      setJob(jobData);
      setAlbum({ ...DEFAULT_ALBUM, ...(jobData.deliveryAlbum || {}) });
      setPhotos(full);
    } catch (cause) {
      console.error("Erro de acesso ao álbum:", cause);
      setError(cause?.code === "permission-denied" || cause?.code === "storage/unauthorized"
        ? "Você não possui permissão para acessar este álbum. Confirme sua conta e as regras do Firebase."
        : cause?.code === "storage/unknown" ? "Não foi possível carregar imagens. Verifique o CORS do Firebase Storage."
        : cause.message || "Não foi possível carregar o álbum.");
    } finally { setLoading(false); }
  }, [jobId, user]);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current = [];
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const destination = `/gallery/${jobId}/album`;
      sessionStorage.setItem("lunivo_redirect", destination);
      navigate(`/login?redirect=${encodeURIComponent(destination)}`, { replace: true });
      return;
    }
    load();
  }, [authLoading, user, jobId, navigate, load]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setActive(null);
      if (!active || !photos.length) return;
      const i = photos.findIndex((p) => p.id === active.id);
      if (event.key === "ArrowRight") setActive(photos[(i + 1) % photos.length]);
      if (event.key === "ArrowLeft") setActive(photos[(i + photos.length - 1) % photos.length]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, photos]);

  async function downloadOne(photo) {
    if (downloading) return;
    setDownloading(true); setError(""); setProgress(`Preparando ${photo.fileName}…`);
    try {
      // getBlob passa pelas regras do Firebase Storage para cada arquivo.
      const blob = await getBlob(ref(storage, photo.storagePath));
      saveBlob(blob, photo.fileName || `${photo.id}.jpg`);
    } catch (cause) {
      console.error("Erro ao baixar foto:", cause);
      setError("Não foi possível baixar esta imagem. Verifique as regras do Storage e a configuração de CORS do bucket.");
    } finally { setDownloading(false); setProgress(""); }
  }

  async function downloadAll() {
    if (downloading || !photos.length) return;
    const totalSize = photos.reduce((sum, photo) => sum + Number(photo.size || 0), 0);
    if (totalSize > 500 * 1024 * 1024) {
      setError("Este álbum ultrapassa 500 MB. Para evitar travamentos no navegador, baixe as fotos individualmente.");
      return;
    }
    setDownloading(true); setError("");
    try {
      const zipped = [];
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        setProgress(`Baixando ${i + 1} de ${photos.length} fotografias…`);
        const blob = await getBlob(ref(storage, photo.storagePath));
        zipped.push({ name: photo.fileName || `${photo.id}.jpg`, bytes: new Uint8Array(await blob.arrayBuffer()) });
      }
      setProgress("Preparando o pacote de fotos…");
      const blob = makePhotoZip(zipped);
      saveBlob(blob, `LUNIVO_${safeFile(job?.title)}_Fotos.zip`);
    } catch (cause) {
      console.error("Erro ao baixar álbum:", cause);
      setError("Falha ao criar o download completo. Verifique permissões do Storage, CORS e sua conexão. Você ainda pode baixar as fotos individualmente.");
    } finally { setDownloading(false); setProgress(""); }
  }

  if (authLoading || loading) return <div className="album-access-message">Preparando seu álbum…</div>;
  if (error && !job) return <div className="album-access-message"><h1>LUNIVO</h1><p>{error}</p>
    <Link to="/login">Entrar com outra conta</Link></div>;
  return <div className="client-album-page" style={{ "--album-theme": album.themeColor, "--album-accent": album.accentColor }}>
    <header className="client-album-nav"><strong>LUNIVO<span>.</span></strong><span>Uma história para guardar</span>
      <button type="button" onClick={downloadAll} disabled={downloading || !photos.length}>↓ Baixar todas as fotos</button></header>
    <main className="client-album-wrap">
      <AlbumCover album={album} photos={photos} />
      <div className="client-album-title-row"><div><span>MEMÓRIAS QUE FICAM</span><h2>Cada instante, uma lembrança.</h2>
        <p>{photos.length} fotografias · Preparadas especialmente para {job?.clientName}</p></div>
        <button type="button" className="client-album-download-all" disabled={downloading || !photos.length} onClick={downloadAll}>↓ Baixar álbum completo</button></div>
      {error && <div className="client-album-error" role="alert">{error}</div>}
      {progress && <div className="client-album-progress" role="status">{progress}</div>}
      {photos.length ? <AlbumMosaic photos={photos} onOpen={setActive} /> : <p className="client-album-empty">Nenhuma fotografia entregue ainda.</p>}
      <footer className="client-album-footer"><div className="client-album-flower">✳</div>
        <h2>Para reviver, sempre.</h2><p>Com carinho, {job?.photographerName || "seu estúdio de fotografia"}.</p><strong>LUNIVO</strong></footer>
    </main>
    {active && <div className="client-album-lightbox" onClick={() => setActive(null)} role="presentation">
      <button type="button" className="client-album-close" aria-label="Fechar fotografia" onClick={() => setActive(null)}>×</button>
      <button type="button" className="client-album-prev" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); const i = photos.findIndex((p) => p.id === active.id); setActive(photos[(i - 1 + photos.length) % photos.length]); }}>‹</button>
      <div className="client-album-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img src={active.url} alt={active.fileName} />
        <div className="client-album-lightbox-toolbar"><span>{photos.findIndex((p) => p.id === active.id) + 1} / {photos.length}</span>
          <button type="button" disabled={downloading} onClick={() => downloadOne(active)}>↓ {downloading ? "Preparando…" : "Baixar fotografia"}</button></div>
      </div>
      <button type="button" className="client-album-next" aria-label="Próxima foto" onClick={(e) => { e.stopPropagation(); const i = photos.findIndex((p) => p.id === active.id); setActive(photos[(i + 1) % photos.length]); }}>›</button>
    </div>}
  </div>;
}
export default ClientAlbum;
