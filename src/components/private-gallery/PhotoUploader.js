import React, { useRef, useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { deleteObject, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import { db, storage } from "../../services/firebase";
import { createProofPreview } from "../../utils/createProofPreview";
import "./PhotoUploader.css";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatBytes = (value) => {
  if (!value) return "0 MB";
  return value < 1024 * 1024
    ? `${Math.round(value / 1024)} KB`
    : `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

function PhotoUploader({ jobId, galleryPublished = false, onUploadComplete }) {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [currentStage, setCurrentStage] = useState("");
  const [currentFileProgress, setCurrentFileProgress] = useState(0);
  const [error, setError] = useState("");

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  function resetProgress() {
    setCompletedCount(0);
    setFailedCount(0);
    setCurrentFile("");
    setCurrentStage("");
    setCurrentFileProgress(0);
    setError("");
  }

  function handleSelectFiles(event) {
    const chosen = Array.from(event.target.files || []);
    const supported = chosen.filter((file) =>
      ALLOWED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
    );
    setFiles(supported);
    resetProgress();
    if (chosen.length !== supported.length) {
      setError("Alguns arquivos foram ignorados. Use JPG, PNG ou WebP com até 50 MB cada.");
    }
  }

  function clearSelection() {
    setFiles([]);
    resetProgress();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadSingleFile(file) {
    const photoId = window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let previewStoragePath = null;
    let uploaded = false;
    try {
      setCurrentFile(file.name);
      setCurrentStage("Otimizando no seu dispositivo");
      setCurrentFileProgress(0);
      const proof = await createProofPreview(file, {
        watermarkText: "PROVA • LUNIVO",
      });
      const ext = proof.contentType === "image/webp" ? "webp" :
        proof.contentType === "image/png" ? "png" : "jpg";
      previewStoragePath =
        `privateJobs/${user.uid}/${jobId}/previews/${photoId}.${ext}`;
      setCurrentStage("Enviando preview protegido");
      const storageRef = ref(storage, previewStoragePath);
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, proof.blob, {
          contentType: proof.contentType,
          customMetadata: { originalFileName: file.name },
        });
        task.on("state_changed", (snapshot) => {
          const total = snapshot.totalBytes || 1;
          setCurrentFileProgress(Math.round(snapshot.bytesTransferred / total * 100));
        }, reject, resolve);
      });
      uploaded = true;
      setCurrentStage("Salvando identificação do arquivo");
      const photoRef = doc(collection(db, "privateJobs", jobId, "photos"), photoId);
      const metadata = {
        photographerId: user.uid,
        jobId,
        fileName: file.name, // Exatamente como no computador da fotógrafa.
        originalFileName: file.name,
        sourceFileSize: file.size,
        previewStoragePath,
        previewContentType: proof.contentType,
        previewWidth: proof.width,
        previewHeight: proof.height,
        previewSize: proof.size,
        watermarkApplied: true,
        storageMode: "preview_only",
        selected: false,
        clientNote: "",
        status: "proof_ready",
        proofVersion: 2,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const batch = writeBatch(db);
      batch.set(photoRef, metadata);
      // Uma galeria já publicada também precisa receber a nova prova.
      if (galleryPublished) {
        const proofRef = doc(db, "privateJobs", jobId, "proofs", photoId);
        batch.set(proofRef, {
          photoId,
          fileName: file.name,
          originalFileName: file.name,
          previewStoragePath,
          previewWidth: proof.width,
          previewHeight: proof.height,
          selected: false,
          clientNote: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setCurrentFileProgress(100);
    } catch (cause) {
      if (uploaded && previewStoragePath) {
        try { await deleteObject(ref(storage, previewStoragePath)); }
        catch (cleanupError) { console.warn("Falha ao limpar preview", cleanupError); }
      }
      throw cause;
    }
  }

  async function handleUpload() {
    if (!user || !jobId || !files.length || uploading) return;
    setUploading(true);
    setError("");
    setCompletedCount(0);
    setFailedCount(0);
    let successes = 0;
    let failures = 0;
    for (const file of files) {
      try {
        await uploadSingleFile(file);
        successes += 1;
        setCompletedCount(successes);
      } catch (cause) {
        console.error(`Falha ao enviar ${file.name}:`, cause);
        failures += 1;
        setFailedCount(failures);
      }
    }
    setUploading(false);
    setCurrentFile("");
    setCurrentStage("");
    setCurrentFileProgress(0);
    if (successes && onUploadComplete) onUploadComplete();
    if (failures) setError(`${failures} foto(s) não foram enviadas. Tente novamente com os arquivos que falharam.`);
    else clearSelection();
  }

  const overallProgress = files.length
    ? Math.round((completedCount + currentFileProgress / 100) / files.length * 100)
    : 0;

  return (
    <div className="photo-uploader">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        multiple onChange={handleSelectFiles} className="photo-file-input"
        id="private-photo-upload" disabled={uploading} />
      {!uploading && files.length === 0 && (
        <label htmlFor="private-photo-upload" className="upload-dropzone modern-upload">
          <div className="upload-visual"><div className="upload-visual-icon">↑</div></div>
          <div className="upload-copy">
            <span className="upload-kicker">Seleção de fotos • Novo fluxo</span>
            <h3>Envie as fotos do seu computador</h3>
            <p>As imagens são reduzidas e protegidas antes do envio. A LUNIVO
              guarda somente os previews e mantém o nome exato de cada arquivo.</p>
          </div>
          <div className="upload-actions-row">
            <span className="upload-format-badge">JPG</span>
            <span className="upload-format-badge">PNG</span>
            <span className="upload-format-badge">WEBP</span>
          </div>
          <span className="upload-select-button">Escolher fotos</span>
          <small className="upload-helper">Os arquivos originais permanecem com você.</small>
        </label>
      )}
      {files.length > 0 && (
        <div className="selected-files modern-selected-files">
          <div className="upload-summary-header">
            <div>
              <span className="upload-kicker">Arquivos selecionados</span>
              <strong className="upload-selection-count">{files.length} foto(s)</strong>
              <span>{formatBytes(totalBytes)} no computador • enviados como previews leves</span>
            </div>
            {!uploading && <button type="button" className="upload-clear-button"
              onClick={clearSelection}>Limpar seleção</button>}
          </div>
          {uploading && (
            <div className="upload-status-card">
              <div className="upload-overall-row"><strong>Preparando galeria</strong><span>{overallProgress}%</span></div>
              <div className="progress-track upload-overall-track">
                <div className="progress-bar" style={{ width: `${overallProgress}%` }} />
              </div>
              <div className="upload-counter-row">
                <span>{completedCount} de {files.length} concluídas</span>
                {failedCount > 0 && <span className="upload-failure-count">{failedCount} falha(s)</span>}
              </div>
              {!!currentFile && <div className="current-upload">
                <div className="current-upload-label"><span>{currentStage}</span><strong title={currentFile}>{currentFile}</strong></div>
                <div className="current-upload-progress">{currentFileProgress}%</div>
              </div>}
            </div>
          )}
          {error && <p className="upload-error">{error}</p>}
          {!uploading && <div className="upload-footer-actions">
            <label htmlFor="private-photo-upload" className="secondary-upload-button">Alterar seleção</label>
            <button className="primary-button upload-button" type="button" onClick={handleUpload}>
              Enviar {files.length} foto(s)
            </button>
          </div>}
        </div>
      )}
      {error && files.length === 0 && <p className="upload-error">{error}</p>}
    </div>
  );
}

export default PhotoUploader;
