import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getEventTypeLabel, getJobStatusLabel, getSelectionStatusLabel } from "../../utils/jobLabels";
import PhotoUploader from "../../components/private-gallery/PhotoUploader";
import PrivateJobPhotos from "../../components/private-gallery/PrivateJobPhotos";
import SelectedProofsPanel from "../../components/private-gallery/SelectedProofsPanel";
import { publishPrivateGallery } from "../../services/privateGalleryService";
import "./PrivateJobDetails.css";

const prettyDate = (value) => {
  if (!value) return "Não informada";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
};
function PrivateJobDetails() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snapshot = await getDoc(doc(db, "privateJobs", jobId));
        if (alive) setJob(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      } catch (cause) { if (alive) setError("Não foi possível carregar as informações do trabalho."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [jobId]);

  async function handlePublishGallery() {
    setPublishing(true); setPublishMessage(""); setPublishError("");
    try {
      await publishPrivateGallery(jobId);
      setJob((old) => ({ ...old, galleryPublished: true, status: "awaiting_selection", selectionStatus: "not_started" }));
      setPublishMessage("Galeria de provas publicada para a cliente.");
    } catch (cause) { setPublishError(cause?.message || "Falha ao publicar a galeria."); }
    finally { setPublishing(false); }
  }
  async function markEditing() {
    try {
      await updateDoc(doc(db, "privateJobs", jobId), { status: "editing", updatedAt: serverTimestamp() });
      setJob((old) => ({ ...old, status: "editing" }));
      setPublishMessage("Status atualizado: em edição.");
    } catch (cause) { setPublishError(cause?.message || "Não foi possível atualizar o status."); }
  }
  if (loading) return <div className="dashboard-page">Carregando trabalho…</div>;
  if (error || !job) return <div className="dashboard-page"><h2>Trabalho indisponível</h2><p>{error || "Não encontrado ou sem acesso."}</p></div>;
  return <div className="dashboard-page private-detail-page">
    <header className="dashboard-header private-detail-header">
      <div><span className="dashboard-eyebrow">TRABALHO PRIVADO · {getEventTypeLabel(job.eventType)}</span>
        <h1>{job.title || "Trabalho sem título"}</h1>
        <p>{job.clientName} · {job.clientEmail}</p></div>
      <div className="private-detail-header-actions">
        <Link to="/photographer/private-jobs" className="secondary-button">← Voltar</Link>
        {job.galleryPublished ? <Link to={`/gallery/${jobId}`} target="_blank" rel="noreferrer" className="secondary-button">Ver seleção ↗</Link>
          : <button type="button" className="primary-button" disabled={publishing} onClick={handlePublishGallery}>
              {publishing ? "Publicando…" : "Publicar provas"}</button>}
        <Link to={`/photographer/private-jobs/${jobId}/album`} className="primary-button">✦ Montar álbum</Link>
      </div>
    </header>
    {publishError && <div className="detail-notice detail-notice-error" role="alert">{publishError}</div>}
    {publishMessage && <div className="detail-notice detail-notice-success" role="status">{publishMessage}</div>}
    <section className="detail-overview">
      <div className="detail-status"><span className="detail-label">ESTADO DO TRABALHO</span>
        <strong>{getJobStatusLabel(job.status) || "Rascunho"}</strong><small>Acompanhe cada etapa da entrega</small></div>
      <div className="detail-metric"><span>SELEÇÃO</span><strong>{getSelectionStatusLabel(job.selectionStatus) || "Não iniciada"}</strong><small>Escolhas da cliente</small></div>
      <div className="detail-metric"><span>FOTOS CONTRATADAS</span><strong>{job.selectionLimit || 0}</strong><small>Incluídas no pacote</small></div>
      <div className="detail-metric"><span>MODALIDADE</span><strong>{getEventTypeLabel(job.eventType) || "Outro"}</strong><small>Tipo de sessão</small></div>
    </section>
    <section className="detail-card detail-info-card">
      <div className="detail-section-heading"><div><span className="dashboard-eyebrow">CADASTRO</span>
        <h2>Informações do trabalho</h2><p>Dados da cliente e detalhes do evento em um só lugar.</p></div>
        <span className="detail-lock">◈ Privado</span></div>
      <div className="detail-info-grid">
        <div className="detail-info-cell"><span className="detail-info-icon">♙</span><div><span className="detail-info-label">CLIENTE</span><strong>{job.clientName || "Não informado"}</strong></div></div>
        <div className="detail-info-cell"><span className="detail-info-icon">✉</span><div><span className="detail-info-label">E-MAIL</span><strong title={job.clientEmail}>{job.clientEmail || "Não informado"}</strong></div></div>
        <div className="detail-info-cell"><span className="detail-info-icon">☎</span><div><span className="detail-info-label">TELEFONE</span><strong>{job.clientPhone || "Não informado"}</strong></div></div>
        <div className="detail-info-cell"><span className="detail-info-icon">▦</span><div><span className="detail-info-label">DATA DO EVENTO</span><strong>{prettyDate(job.eventDate)}</strong></div></div>
      </div>
      {job.notes && <div className="detail-notes"><span>OBSERVAÇÕES INTERNAS</span><p>{job.notes}</p></div>}
    </section>
    <section className="detail-delivery-card">
      <div className="detail-delivery-mark">✧</div><div><span className="dashboard-eyebrow">ENTREGA FINAL</span>
        <h2>Transforme suas fotos em um álbum inesquecível.</h2>
        <p>Envie as fotos editadas, escolha a capa e personalize os enquadramentos. A cliente acessa seu álbum privado para baixar as imagens.</p>
        <div className="detail-delivery-actions"><Link to={`/photographer/private-jobs/${jobId}/album`} className="primary-button">{job.deliveryPublished ? "Editar álbum entregue ↗" : "Criar álbum da cliente ↗"}</Link>
          {job.deliveryPublished && <Link to={`/gallery/${jobId}/album`} target="_blank" className="secondary-button">Visualizar entrega</Link>}
          {job.selectionStatus === "completed" && job.status === "selection_received" &&
            <button type="button" className="secondary-button" onClick={markEditing}>Marcar como em edição</button>}</div>
      </div>
    </section>
    <section className="detail-proofs-section"><div className="detail-section-heading"><div>
      <span className="dashboard-eyebrow">PROVAS PARA SELEÇÃO</span><h2>Adicionar fotos</h2>
      <p>A LUNIVO envia somente previews protegidos. Os originais ficam no seu computador.</p></div></div>
      <PhotoUploader jobId={jobId} galleryPublished={!!job.galleryPublished} onUploadComplete={() => setRefresh((n) => n + 1)} />
    </section>
    <SelectedProofsPanel jobId={jobId} job={job} onJobUpdated={(values) => setJob((old) => ({ ...old, ...values }))} />
    <PrivateJobPhotos jobId={jobId} refreshKey={refresh} />
  </div>;
}
export default PrivateJobDetails;
