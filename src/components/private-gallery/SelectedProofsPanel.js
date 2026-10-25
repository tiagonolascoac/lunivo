import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import "./SelectedProofsPanel.css";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL",
});

function SelectedProofsPanel({ jobId, job }) {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (!jobId || job?.selectionStatus !== "completed") {
      setSelectedPhotos([]);
      return undefined;
    }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const selected = await getDocs(query(
          collection(db, "privateJobs", jobId, "proofs"),
          where("selected", "==", true)
        ));
        const photos = selected.docs.map((snapshot) => ({
          id: snapshot.id,
          fileName: snapshot.data().originalFileName || snapshot.data().fileName || snapshot.id,
        })).sort((a, b) => a.fileName.localeCompare(b.fileName, "pt-BR", { numeric: true }));
        if (active) setSelectedPhotos(photos);
      } catch (cause) {
        console.error("Falha ao buscar relação de fotos:", cause);
        if (active) setError("Não foi possível carregar a seleção. Confira as permissões do Firestore.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [jobId, job?.selectionStatus]);

  const selectionText = useMemo(() => [
    "LUNIVO — RELAÇÃO DE FOTOS SELECIONADAS",
    `Trabalho: ${job?.title || "Sem título"}`,
    `Cliente: ${job?.clientName || "Não informado"}`,
    `Quantidade: ${selectedPhotos.length}`,
    `Fotos contratadas: ${Number(job?.selectionLimit || 0)}`,
    `Fotos adicionais: ${Number(job?.extraSelectedCount || 0)}`,
    `Valor adicional: ${money(job?.extraAmount)}`,
    "",
    "ARQUIVOS:",
    ...selectedPhotos.map((photo) => photo.fileName),
  ].join("\n"), [job, selectedPhotos]);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectionText);
      } else {
        const element = document.createElement("textarea");
        element.value = selectionText;
        document.body.appendChild(element);
        element.select();
        if (!document.execCommand("copy")) throw new Error("Falha ao copiar");
        element.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (cause) {
      setError("Não foi possível copiar automaticamente. Use a opção de exportar TXT.");
    }
  }

  function handleDownloadTxt() {
    const blob = new Blob(["\uFEFF", selectionText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (job?.title || "selecao").replace(/[^a-z0-9_-]+/gi, "_");
    link.href = url;
    link.download = `LUNIVO_${safeName}_selecao.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (job?.selectionStatus !== "completed") {
    return <section className="selected-proof-panel">
      <span className="selected-proof-kicker">Seleção do cliente</span>
      <h2>Aguardando a seleção</h2>
      <p>Quando o cliente finalizar a escolha, os nomes das fotos aparecerão aqui.
        Não será necessário armazenar ou baixar arquivos originais.</p>
    </section>;
  }
  return <section className="selected-proof-panel">
    <div className="selected-proof-header">
      <div>
        <span className="selected-proof-kicker">Seleção recebida</span>
        <h2>Arquivos escolhidos pelo cliente</h2>
        <p>Localize os originais no seu computador pelos nomes abaixo.</p>
      </div>
      <div className="selected-list-actions">
        <button type="button" onClick={handleCopy} disabled={loading || !selectedPhotos.length}
          className="selected-download-all">{copied ? "✓ Copiado!" : "Copiar lista"}</button>
        <button type="button" onClick={handleDownloadTxt} disabled={loading || !selectedPhotos.length}
          className="secondary-button">Exportar TXT</button>
      </div>
    </div>
    <div className="selected-summary-grid">
      <div className="selected-summary-card"><span>Selecionadas</span><strong>{job?.selectedCount ?? selectedPhotos.length}</strong></div>
      <div className="selected-summary-card"><span>Contratadas</span><strong>{job?.selectionLimit || 0}</strong></div>
      <div className="selected-summary-card"><span>Adicionais</span><strong>{job?.extraSelectedCount || 0}</strong></div>
      <div className="selected-summary-card"><span>Valor adicional</span><strong>{money(job?.extraAmount)}</strong></div>
    </div>
    {loading && <p>Carregando nomes dos arquivos...</p>}
    {error && <p className="selected-proof-error" role="alert">{error}</p>}
    {!loading && !error && selectedPhotos.length === 0 && <p>Nenhuma foto selecionada.</p>}
    {!loading && selectedPhotos.length > 0 && <>
      <p className="selected-list-tip">A lista mantém a extensão original. Se houver nomes repetidos, confira seus arquivos antes de editar.</p>
      <ol className="selected-file-list">
        {selectedPhotos.map((photo) => <li key={photo.id}>
          <span title={photo.fileName}>{photo.fileName}</span>
        </li>)}
      </ol>
    </>}
  </section>;
}

export default SelectedProofsPanel;
