import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { getEventTypeLabel, getJobStatusLabel } from "../../utils/jobLabels";
import "./PrivateJobs.css";

const filters = [
  { value: "all", label: "Todos" },
  { value: "awaiting", label: "Aguardando seleção" },
  { value: "received", label: "Seleção recebida" },
  { value: "editing", label: "Em edição" },
  { value: "delivered", label: "Entregues" },
];
function getFilter(job) {
  if (job.deliveryPublished || job.status === "delivered") return "delivered";
  if (job.status === "editing" || job.status === "ready") return "editing";
  if (job.selectionStatus === "completed" || job.status === "selection_received") return "received";
  return "awaiting";
}
function PrivateJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    let alive = true;
    if (!user) { setLoading(false); return undefined; }
    (async () => {
      setLoading(true); setError("");
      try {
        const snap = await getDocs(query(collection(db, "privateJobs"), where("photographerId", "==", user.uid)));
        const found = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        found.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        if (alive) setJobs(found);
      } catch (cause) { if (alive) setError("Não foi possível carregar os trabalhos."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user]);
  const results = useMemo(() => jobs.filter((job) => {
    const hit = [job.title, job.clientName, job.clientEmail].join(" ").toLowerCase().includes(search.toLowerCase());
    return hit && (filter === "all" || filter === getFilter(job));
  }), [jobs, filter, search]);
  return <div className="dashboard-page private-jobs-page">
    <header className="dashboard-header"><div><span className="dashboard-eyebrow">SEU PORTFÓLIO DE CLIENTES</span>
      <h1>Trabalhos privados</h1><p>Acompanhe cada seleção, edição e entrega sem sair desta página.</p></div>
      <Link className="primary-button" to="/photographer/private-jobs/new">＋ Novo trabalho</Link></header>
    {error && <p className="private-jobs-error" role="alert">{error}</p>}
    <div className="private-jobs-toolbar"><div className="private-jobs-filters" role="group" aria-label="Filtrar trabalhos">
      {filters.map((f) => <button type="button" key={f.value} onClick={() => setFilter(f.value)} className={filter === f.value ? "active" : ""}>
        {f.label}<span>{f.value === "all" ? jobs.length : jobs.filter((job) => getFilter(job) === f.value).length}</span></button>)}
      </div><input aria-label="Buscar trabalhos" placeholder="Buscar cliente ou trabalho…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    {loading ? <p>Carregando trabalhos…</p> : results.length === 0 ? <div className="empty-state"><div className="empty-icon">✦</div>
      <h3>Nenhum trabalho neste filtro</h3><p>Altere os filtros ou cadastre um novo trabalho.</p>
      <Link className="primary-button" to="/photographer/private-jobs/new">Criar trabalho</Link></div>
      : <div className="private-jobs-list">{results.map((job) => <article key={job.id} className="private-jobs-item">
        <div className="private-jobs-avatar">{(job.clientName || "C").slice(0, 1).toUpperCase()}</div>
        <div className="private-jobs-main"><span>{getEventTypeLabel(job.eventType) || "Ensaio"}</span>
          <Link to={`/photographer/private-jobs/${job.id}`}>{job.title || "Trabalho sem título"}</Link>
          <small>{job.clientName} · {job.clientEmail}</small></div>
        <div className="private-jobs-state"><span className={`private-jobs-pill pill-${getFilter(job)}`}>
          {job.deliveryPublished ? "Entregue" : getJobStatusLabel(job.status) || "Rascunho"}</span>
          <small>{job.selectionStatus === "completed" ? "✓ Seleção finalizada" : "Seleção pendente"}</small></div>
        <div className="private-jobs-actions"><Link to={`/photographer/private-jobs/${job.id}`} className="secondary-button">Abrir trabalho</Link>
          {(job.selectionStatus === "completed" || job.deliveryPublished) && <Link to={`/photographer/private-jobs/${job.id}/album`} className="private-jobs-album-link">✧ Álbum</Link>}</div>
      </article>)}</div>}
  </div>;
}
export default PrivateJobs;
