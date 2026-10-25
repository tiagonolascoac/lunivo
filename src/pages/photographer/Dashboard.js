import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { getJobStatusLabel } from "../../utils/jobLabels";
import "./Dashboard.css";

function Dashboard() {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!user?.uid) { setLoading(false); return undefined; }
    async function load() {
      try {
        setLoading(true);
        const list = await getDocs(query(collection(db, "privateJobs"), where("photographerId", "==", user.uid)));
        const items = list.docs.map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        if (active) setJobs(items);
      } catch (cause) {
        console.error("Erro no dashboard:", cause);
        if (active) setError("Não foi possível carregar seus indicadores.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user?.uid]);
  const metrics = useMemo(() => ({
    total: jobs.length,
    waiting: jobs.filter((job) => job.galleryPublished && job.selectionStatus !== "completed").length,
    received: jobs.filter((job) => job.selectionStatus === "completed").length,
    notPublished: jobs.filter((job) => !job.galleryPublished).length,
  }), [jobs]);
  const greeting = (userProfile?.name || "Fotógrafa").trim().split(/\s+/)[0];
  return <div className="dashboard-page">
    <header className="dashboard-header">
      <div><span className="dashboard-eyebrow">PAINEL DO ESTÚDIO</span><h1>Bem-vinda, {greeting}<span className="title-accent">.</span></h1>
        <p>Suas galerias, suas seleções e seus clientes organizados em um só lugar.</p></div>
      <Link to="/photographer/private-jobs/new" className="primary-button dashboard-create">＋ Criar trabalho</Link>
    </header>
    <div className="dashboard-feature">
      <div><span className="dashboard-feature-eyebrow">GESTÃO SIMPLES DE FOTOGRAFIA</span>
        <h2>Mais tempo para criar.<br/><em>Menos tempo organizando.</em></h2>
        <p>O cliente escolhe, você recebe os nomes dos arquivos e segue com a edição no seu computador.</p>
        <Link to="/photographer/private-jobs" className="dashboard-feature-link">Ver meus trabalhos →</Link>
      </div><div className="dashboard-feature-art" aria-hidden="true"><div>✦</div><span>L</span></div>
    </div>
    <section className="dashboard-section">
      <div className="section-heading"><div><span>SEU RESUMO</span><h2>Visão geral</h2></div>
        <Link to="/photographer/private-jobs" className="section-action">Todos os trabalhos →</Link></div>
      {error && <p className="dashboard-notice" role="alert">{error}</p>}
      <div className="stats-grid">
        {[
          { label: "Trabalhos privados", value: metrics.total, note: "Total cadastrado", symbol: "▦" },
          { label: "Aguardando seleção", value: metrics.waiting, note: "Galerias publicadas", symbol: "◷" },
          { label: "Seleções recebidas", value: metrics.received, note: "Prontas para organizar", symbol: "✓" },
          { label: "Rascunhos", value: metrics.notPublished, note: "Aguardando publicação", symbol: "✧" },
        ].map((m) => <div className="stat-card" key={m.label}><div className="stat-top"><span>{m.label}</span><i>{m.symbol}</i></div>
          <strong>{loading ? "—" : m.value}</strong><small>{m.note}</small></div>)}
      </div>
    </section>
    <section className="dashboard-section"><div className="section-heading"><div><span>ACOMPANHAMENTO</span><h2>Trabalhos recentes</h2></div></div>
      {jobs.length === 0 && !loading ? <div className="empty-state"><div className="empty-icon">✦</div>
        <h3>Sua primeira história começa aqui</h3><p>Crie um trabalho privado e compartilhe a galeria com seu cliente.</p>
        <Link to="/photographer/private-jobs/new" className="primary-button">Criar trabalho privado</Link></div>
      : <div className="recent-job-list">
        {jobs.slice(0, 5).map((job) => <Link key={job.id} to={`/photographer/private-jobs/${job.id}`} className="recent-job">
          <span className="recent-job-avatar">{(job.clientName || "C").slice(0,1).toUpperCase()}</span>
          <span className="recent-job-name"><strong>{job.title || "Trabalho sem título"}</strong><small>{job.clientName || "Cliente não informado"}</small></span>
          <span className={`recent-status ${job.selectionStatus === "completed" ? "received" : ""}`}>{getJobStatusLabel(job.status)}</span><span className="recent-arrow">→</span>
        </Link>)}
        {loading && <p>Carregando...</p>}
      </div>}
    </section>
  </div>;
}
export default Dashboard;
