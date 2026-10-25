import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import { db, storage } from "../../services/firebase";
import { DEFAULT_ALBUM, loadAlbumPhotos, publishAlbum, saveAlbum } from "../../services/albumService";
import { AlbumCover, AlbumMosaic, ALBUM_FONTS } from "../../components/album/AlbumCanvas";
import "./AlbumStudio.css";

const formats = [{ id: "square", label: "Quadrado" }, { id: "wide", label: "Paisagem" },
  { id: "portrait", label: "Retrato" }, { id: "full", label: "Panorâmica" }];
const palettes = [
  { name: "Petróleo", themeColor: "#193d43", accentColor: "#c5a47e" },
  { name: "Editorial", themeColor: "#2c2b29", accentColor: "#d1b89d" },
  { name: "Borgonha", themeColor: "#54373e", accentColor: "#d7b0a6" },
  { name: "Oliva", themeColor: "#424b3c", accentColor: "#e4caa0" },
];
const maxFileSize = 60 * 1024 * 1024;
const supported = ["image/jpeg", "image/png", "image/webp"];
const readableError = (err) => err?.code === "storage/unauthorized" || err?.code === "permission-denied"
  ? "Sem permissão para gravar a entrega. Configure as regras do Firebase conforme as instruções do pacote."
  : (err?.message || "Não foi possível concluir a operação.");

async function makeSmallPreview(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Falha ao gerar miniatura.")), "image/webp", .8));
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

function AlbumStudio() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const dragId = useRef(null);
  const [job, setJob] = useState(null);
  const [album, setAlbum] = useState(DEFAULT_ALBUM);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "", pct: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const snap = await getDoc(doc(db, "privateJobs", jobId));
      if (!snap.exists() || snap.data().photographerId !== user?.uid) {
        throw new Error("Trabalho não encontrado ou sem permissão.");
      }
      setJob({ id: snap.id, ...snap.data() });
      setAlbum({ ...DEFAULT_ALBUM, ...(snap.data().deliveryAlbum || {}) });
      const items = await loadAlbumPhotos(jobId);
      const withUrls = await Promise.all(items.map(async (item) => {
        try {
          const url = await getDownloadURL(ref(storage, item.previewStoragePath || item.storagePath));
          return { ...item, url };
        } catch (cause) { return { ...item, url: "" }; }
      }));
      setPhotos(withUrls);
      setDirty(false);
    } catch (cause) { setError(readableError(cause)); }
    finally { setBusy(false); }
  }, [jobId, user?.uid]);
  useEffect(() => { if (user) load(); }, [load, user]);

  function changeAlbum(field, value) { setAlbum((old) => ({ ...old, [field]: value })); setDirty(true); }
  function changePhoto(id, updates) { setPhotos((list) => list.map((p) => p.id === id ? { ...p, ...updates } : p)); setDirty(true); }
  function movePhoto(sourceId, targetId) {
    if (sourceId === targetId) return;
    setPhotos((list) => {
      const next = [...list];
      const from = next.findIndex((p) => p.id === sourceId);
      const to = next.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0) return list;
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    setDirty(true);
  }
  function moveOne(id, amount) {
    const from = photos.findIndex((p) => p.id === id);
    const to = from + amount;
    if (to >= 0 && to < photos.length) movePhoto(id, photos[to].id);
  }

  async function uploadFile(file, order) {
    const photoId = window.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fullPath = `privateJobs/${user.uid}/${jobId}/deliveries/${photoId}.${ext}`;
    const previewPath = `privateJobs/${user.uid}/${jobId}/deliveryPreviews/${photoId}.webp`;
    let originalSent = false;
    let previewSent = false;
    try {
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, fullPath), file, {
          contentType: file.type,
          customMetadata: { originalFileName: file.name },
        });
        task.on("state_changed", (snap) => setProgress((p) => ({ ...p, pct: Math.round(snap.bytesTransferred / Math.max(1, snap.totalBytes) * 85) })), reject, resolve);
      });
      originalSent = true;
      const thumb = await makeSmallPreview(file);
      await uploadBytesResumable(ref(storage, previewPath), thumb, { contentType: "image/webp" });
      previewSent = true;
      setProgress((p) => ({ ...p, pct: 98 }));
      const photo = {
        photographerId: user.uid, fileName: file.name, storagePath: fullPath,
        previewStoragePath: previewPath, contentType: file.type,
        size: file.size, layout: "square", order,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "privateJobs", jobId, "deliveryPhotos", photoId), photo);
      const url = await getDownloadURL(ref(storage, previewPath));
      return { id: photoId, ...photo, url };
    } catch (cause) {
      if (originalSent) await deleteObject(ref(storage, fullPath)).catch(() => {});
      if (previewSent) await deleteObject(ref(storage, previewPath)).catch(() => {});
      throw cause;
    }
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const invalid = files.filter((f) => !supported.includes(f.type) || f.size > maxFileSize);
    if (invalid.length) { setError("Use JPG, PNG ou WEBP de até 60 MB por foto. Alguns arquivos foram ignorados."); }
    const valid = files.filter((f) => supported.includes(f.type) && f.size <= maxFileSize);
    if (!valid.length) return;
    setUploading(true); setMessage("");
    let index = photos.length;
    const done = [];
    let failures = 0;
    for (const file of valid) {
      setProgress({ current: done.length + failures + 1, total: valid.length, name: file.name, pct: 0 });
      try { done.push(await uploadFile(file, index)); index += 1; }
      catch (cause) { console.error("Erro no upload do álbum", cause); setError(readableError(cause)); failures += 1; }
    }
    if (done.length) {
      setPhotos((old) => [...old, ...done]);
      setAlbum((old) => old.coverPhotoId ? old : { ...old, coverPhotoId: done[0].id });
      setDirty(true);
      setMessage(`${done.length} fotografia(s) adicionada(s). Salve o layout quando terminar.`);
    }
    setUploading(false);
  }

  async function handleDelete(photo) {
    if (!window.confirm(`Excluir ${photo.fileName} da entrega?`)) return;
    setSaving(true); setError("");
    try {
      // Primeiro remove a referência da galeria para não exibir arquivo ausente.
      await deleteDoc(doc(db, "privateJobs", jobId, "deliveryPhotos", photo.id));
      await Promise.all([
        deleteObject(ref(storage, photo.storagePath)).catch((e) => console.warn(e)),
        photo.previewStoragePath ? deleteObject(ref(storage, photo.previewStoragePath)).catch((e) => console.warn(e)) : Promise.resolve(),
      ]);
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
      if (album.coverPhotoId === photo.id) changeAlbum("coverPhotoId", photos.find((p) => p.id !== photo.id)?.id || "");
      setDirty(true);
    } catch (cause) { setError(readableError(cause)); }
    finally { setSaving(false); }
  }

  async function handleSave(publish = false) {
    setError(""); setMessage(""); setSaving(true);
    try {
      if (publish) {
        if (!window.confirm("Entregar este álbum agora? O cliente poderá visualizar e baixar as fotos.")) return;
        await publishAlbum(jobId, album, photos);
        setJob((current) => ({ ...current, deliveryPublished: true, status: "delivered" }));
        setMessage("Álbum entregue! O cliente pode acessar o link privado com sua conta.");
      } else {
        await saveAlbum(jobId, album, photos);
        setMessage("Álbum salvo com sucesso.");
      }
      setDirty(false);
    } catch (cause) { setError(readableError(cause)); }
    finally { setSaving(false); }
  }

  if (busy) return <div className="dashboard-page">Carregando estúdio do álbum…</div>;
  if (!job) return <div className="dashboard-page"><h2>Álbum indisponível</h2><p>{error}</p></div>;
  return <div className="dashboard-page album-studio">
    <header className="dashboard-header studio-header">
      <div><span className="dashboard-eyebrow">ENTREGA DE FOTOGRAFIAS</span><h1>Estúdio do álbum</h1>
        <p>Monte uma experiência especial para {job.clientName}. Arraste as fotos, escolha formatos, capa e estilo.</p></div>
      <div className="studio-header-actions">
        <Link className="secondary-button" to={`/photographer/private-jobs/${jobId}`}>← Voltar ao trabalho</Link>
        {job.deliveryPublished && <Link className="secondary-button" to={`/gallery/${jobId}/album`} target="_blank">Ver álbum entregue ↗</Link>}
      </div>
    </header>
    {error && <p className="studio-alert studio-error" role="alert">{error}</p>}
    {message && <p className="studio-alert studio-success" role="status">{message}</p>}
    <div className="studio-layout">
      <aside className="studio-settings">
        <div className="studio-panel"><span className="studio-kicker">01 / IDENTIDADE</span><h2>Personalize seu álbum</h2>
          <label>Título da capa<input value={album.title} maxLength={100} onChange={(e) => changeAlbum("title", e.target.value)} /></label>
          <label>Subtítulo<input value={album.subtitle} maxLength={140} onChange={(e) => changeAlbum("subtitle", e.target.value)} /></label>
          <label>Fonte do título<select value={album.font} onChange={(e) => changeAlbum("font", e.target.value)}>
            {Object.entries(ALBUM_FONTS).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
          </select></label>
          <p className="studio-tiny-label">Paleta do álbum</p>
          <div className="studio-palettes">{palettes.map((p) => <button key={p.name} type="button" title={p.name}
            aria-label={`Usar paleta ${p.name}`} className={album.themeColor === p.themeColor ? "selected" : ""}
            style={{ background: p.themeColor, borderColor: p.accentColor }} onClick={() => { setAlbum((old) => ({ ...old, themeColor: p.themeColor, accentColor: p.accentColor })); setDirty(true); }} />)}</div>
          <div className="studio-colors"><label>Cor principal<input type="color" value={album.themeColor} onChange={(e) => changeAlbum("themeColor", e.target.value)} /></label>
            <label>Detalhes<input type="color" value={album.accentColor} onChange={(e) => changeAlbum("accentColor", e.target.value)} /></label></div>
        </div>
        <div className="studio-panel"><span className="studio-kicker">02 / FOTOGRAFIAS</span><h2>Fotos finalizadas</h2>
          <p>Envie os arquivos editados em qualidade original. As miniaturas da página serão otimizadas automaticamente.</p>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleFiles} />
          <button className="studio-upload-button" type="button" onClick={() => inputRef.current?.click()} disabled={uploading || saving}>＋ Adicionar fotografias</button>
          {uploading && <div className="studio-progress"><strong>{progress.current} de {progress.total}</strong><span title={progress.name}>{progress.name}</span>
            <div><span style={{ width: `${progress.pct}%` }} /></div></div>}
          <p className="studio-help">Formatos aceitos: JPG, PNG, WebP • Até 60 MB por arquivo.</p>
        </div>
        <div className="studio-panel"><span className="studio-kicker">03 / PUBLICAÇÃO</span><h2>{job.deliveryPublished ? "Álbum publicado" : "Pronto para entregar?"}</h2>
          <p>O cliente acessa apenas com a conta cadastrada para este trabalho.</p>
          <button className="secondary-button studio-wide" type="button" disabled={saving || uploading} onClick={() => handleSave(false)}>
            {saving ? "Salvando…" : dirty ? "Salvar alterações *" : "Salvar álbum"}</button>
          <button className="primary-button studio-wide" type="button" disabled={saving || uploading || photos.length === 0} onClick={() => handleSave(true)}>
            {saving ? "Processando…" : job.deliveryPublished ? "Atualizar entrega" : "Entregar álbum ao cliente ↗"}</button>
          {job.deliveryPublished && <p className="studio-published">● Entregue — o link está disponível para o cliente.</p>}
        </div>
      </aside>
      <main className="studio-preview">
        <div className="studio-preview-heading"><div><span className="studio-kicker">VISUALIZAÇÃO</span><h2>Uma história contada em imagens</h2></div>
          <span>{photos.length} fotografia(s) · {dirty ? "Alterações não salvas" : "Salvo"}</span></div>
        <AlbumCover album={album} photos={photos} small onOpen={setPreviewPhoto} />
        <div className="studio-mosaic-heading"><h3>Composição do álbum</h3><p>Arraste para reordenar. Escolha o enquadramento de cada foto.</p></div>
        {photos.length === 0 ? <div className="studio-empty"><span>✧</span><h3>Sua história começa aqui</h3><p>Adicione fotografias editadas para criar o álbum.</p></div>
          : <AlbumMosaic photos={photos} onOpen={setPreviewPhoto} renderControls={(photo) =>
            <div className="studio-photo-controls" data-album-photo-id={photo.id} draggable onTouchStart={() => { dragId.current = photo.id; }}
              onTouchEnd={(event) => { const finger = event.changedTouches?.[0]; const target = finger && document.elementFromPoint(finger.clientX, finger.clientY)?.closest("[data-album-photo-id]"); if (target) movePhoto(dragId.current, target.getAttribute("data-album-photo-id")); dragId.current = null; }}
              onDragStart={(event) => { dragId.current = photo.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", photo.id); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => { event.preventDefault(); movePhoto(dragId.current, photo.id); dragId.current = null; }}>
              <div className="studio-photo-top"><span className="studio-drag-handle" title="Arraste este painel para mudar a ordem">⠿ Arrastar</span>
                <button type="button" title="Definir como capa" onClick={() => changeAlbum("coverPhotoId", photo.id)}>{album.coverPhotoId === photo.id ? "★ Capa" : "☆ Capa"}</button></div>
              <div className="studio-photo-bottom"><select aria-label={`Formato de ${photo.fileName}`} value={photo.layout || "square"} onChange={(e) => changePhoto(photo.id, { layout: e.target.value })}>
                {formats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
                <button type="button" aria-label="Mover para esquerda" onClick={() => moveOne(photo.id, -1)}>←</button>
                <button type="button" aria-label="Mover para direita" onClick={() => moveOne(photo.id, 1)}>→</button>
                <button type="button" className="studio-delete" title="Excluir foto" onClick={() => handleDelete(photo)}>×</button></div>
            </div>} />}
      </main>
    </div>
    {previewPhoto && <div className="studio-lightbox" onClick={() => setPreviewPhoto(null)} role="presentation">
      <button type="button" className="studio-lightbox-close" onClick={() => setPreviewPhoto(null)} aria-label="Fechar">×</button>
      <img src={previewPhoto.url} alt={previewPhoto.fileName || "Fotografia"} onClick={(e) => e.stopPropagation()} />
    </div>}
  </div>;
}
export default AlbumStudio;
