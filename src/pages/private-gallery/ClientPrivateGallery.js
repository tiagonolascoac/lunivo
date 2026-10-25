import React, {
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
} from "firebase/storage";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  db,
  storage,
} from "../../services/firebase";

import {
  useAuth,
} from "../../contexts/AuthContext";

import "./ClientPrivateGallery.css";

function ClientPrivateGallery() {
  const { jobId } =
    useParams();

  const navigate =
    useNavigate();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [job, setJob] =
    useState(null);

  const [proofs, setProofs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    expandedPhoto,
    setExpandedPhoto,
  ] = useState(null);

  const [
    extraPhotoCandidate,
    setExtraPhotoCandidate,
  ] = useState(null);

  const [
    showFinalizeModal,
    setShowFinalizeModal,
  ] = useState(false);

  const [
    finalizing,
    setFinalizing,
  ] = useState(false);

  const [
    selectionFinished,
    setSelectionFinished,
  ] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      const destination =
        `/gallery/${jobId}`;

      sessionStorage.setItem(
        "lunivo_redirect",
        destination
      );

      navigate(
        `/login?redirect=${encodeURIComponent(
          destination
        )}`,
        {
          replace: true,
        }
      );

      return;
    }

    loadGallery();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    authLoading,
    jobId,
  ]);

  async function loadGallery() {
    try {
      setLoading(true);
      setError("");

      const jobRef = doc(
        db,
        "privateJobs",
        jobId
      );

      const jobSnapshot =
        await getDoc(jobRef);

      if (!jobSnapshot.exists()) {
        setError(
          "Galeria não encontrada."
        );

        return;
      }

      const jobData = {
        id: jobSnapshot.id,
        ...jobSnapshot.data(),
      };

      setJob(jobData);

      if (
        jobData.selectionStatus ===
        "completed"
      ) {
        setSelectionFinished(true);
      }

      const proofsRef =
        collection(
          db,
          "privateJobs",
          jobId,
          "proofs"
        );

      const proofsQuery =
        query(
          proofsRef,
          orderBy(
            "createdAt",
            "asc"
          )
        );

      const snapshot =
        await getDocs(
          proofsQuery
        );

      const loadedProofs =
        await Promise.all(
          snapshot.docs.map(
            async (
              proofDocument
            ) => {
              const proof =
                proofDocument.data();

              const previewRef =
                ref(
                  storage,
                  proof.previewStoragePath
                );

              const url =
                await getDownloadURL(
                  previewRef
                );

              return {
                id:
                  proofDocument.id,

                ...proof,

                url,
              };
            }
          )
        );

      setProofs(
        loadedProofs
      );
    } catch (galleryError) {
      console.error(
        "ERRO GALERIA:",
        galleryError
      );

      if (
        galleryError?.code ===
        "permission-denied"
      ) {
        setError(
          "Você não possui acesso a esta galeria."
        );
      } else if (
        galleryError?.code ===
        "storage/unauthorized"
      ) {
        setError(
          "Você possui acesso à galeria, mas as imagens não puderam ser carregadas."
        );
      } else {
        setError(
          "Não foi possível abrir esta galeria."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateFavorite(
    proof,
    nextValue
  ) {
    setProofs(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            proof.id
              ? {
                  ...item,
                  selected:
                    nextValue,
                }
              : item
        )
    );

    if (
      expandedPhoto?.id ===
      proof.id
    ) {
      setExpandedPhoto(
        (current) => ({
          ...current,
          selected:
            nextValue,
        })
      );
    }

    try {
      const proofRef =
        doc(
          db,
          "privateJobs",
          jobId,
          "proofs",
          proof.id
        );

      await updateDoc(
        proofRef,
        {
          selected:
            nextValue,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (updateError) {
      console.error(
        "Erro ao atualizar favorito:",
        updateError
      );

      setProofs(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              proof.id
                ? {
                    ...item,
                    selected:
                      proof.selected,
                  }
                : item
          )
      );

      if (
        expandedPhoto?.id ===
        proof.id
      ) {
        setExpandedPhoto(
          (current) => ({
            ...current,
            selected:
              proof.selected,
          })
        );
      }
    }
  }

  async function toggleFavorite(
    proof,
    forceExtra = false
  ) {
    if (
      !job ||
      selectionFinished
    ) {
      return;
    }

    const selectedCount =
      proofs.filter(
        (item) =>
          item.selected
      ).length;

    const limit =
      Number(
        job.selectionLimit ||
          0
      );

    if (
      !proof.selected &&
      !forceExtra &&
      limit > 0 &&
      selectedCount >=
        limit
    ) {
      setExtraPhotoCandidate(
        proof
      );

      return;
    }

    await updateFavorite(
      proof,
      !proof.selected
    );
  }

  async function finalizeSelection() {
    if (!job) {
      return;
    }

    try {
      setFinalizing(true);

      const selectedCount =
        proofs.filter(
          (photo) =>
            photo.selected
        ).length;

      const limit =
        Number(
          job.selectionLimit ||
            0
        );

      const extraCount =
        Math.max(
          0,
          selectedCount -
            limit
        );

      const extraPrice =
        Number(
          job.extraPhotoPrice ||
            0
        );

      const extraAmount =
        extraCount *
        extraPrice;

      const jobRef =
        doc(
          db,
          "privateJobs",
          jobId
        );

      await updateDoc(
        jobRef,
        {
          selectionStatus:
            "completed",

          status:
            "selection_received",

          selectedCount,

          extraSelectedCount:
            extraCount,

          extraAmount,

          selectionCompletedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      setSelectionFinished(
        true
      );

      setShowFinalizeModal(
        false
      );

      setJob(
        (current) => ({
          ...current,

          selectionStatus:
            "completed",

          status:
            "selection_received",

          selectedCount,

          extraSelectedCount:
            extraCount,

          extraAmount,
        })
      );
    } catch (finalizeError) {
      console.error(
        "Erro ao finalizar seleção:",
        finalizeError
      );

      alert(
        "Não foi possível finalizar sua seleção."
      );
    } finally {
      setFinalizing(false);
    }
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="client-gallery-loading">
        Carregando sua galeria...
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-gallery-error">
        <h1>
          LUNIVO
        </h1>

        <p>
          {error}
        </p>
      </div>
    );
  }

  const selectedCount =
    proofs.filter(
      (photo) =>
        photo.selected
    ).length;

  const selectionLimit =
    Number(
      job?.selectionLimit ||
        0
    );

  const extraPhotoPrice =
    Number(
      job?.extraPhotoPrice ||
        0
    );

  const extraCount =
    Math.max(
      0,
      selectedCount -
        selectionLimit
    );

  const extraAmount =
    extraCount *
    extraPhotoPrice;

  return (
    <div className="client-gallery-page">

      <header className="client-gallery-hero">

        <div className="client-gallery-brand">
          LUNIVO
        </div>

        <div className="client-gallery-title">

          <span>
            GALERIA PRIVADA
          </span>

          <h1>
            {job?.title}
          </h1>

          <p>
            {job?.clientName}
          </p>

        </div>

      </header>

      <main className="client-gallery-content">
        {job?.deliveryPublished && <div className="client-delivery-ready">
          <div><span>✦ ENTREGA FINAL</span><h2>Seu álbum está pronto!</h2>
            <p>A fotógrafa preparou suas imagens em um álbum especial. Veja e baixe suas fotos finalizadas.</p></div>
          <a href={`/gallery/${jobId}/album`}>Abrir meu álbum ↗</a>
        </div>}


        <div className="client-gallery-intro">

          <div>

            <span>
              SUA SELEÇÃO
            </span>

            <h2>
              Escolha suas favoritas
            </h2>

            <p>
              Clique nas fotografias
              para ampliar e use o
              coração para selecionar.
            </p>

          </div>

          <div className="client-selection-counter">

            <strong>
              {selectedCount}
            </strong>

            <span>
              {" "}
              de{" "}
              {selectionLimit ||
                "∞"}
            </span>

          </div>

        </div>

        {extraCount > 0 && (
          <div className="extra-selection-summary">

            <strong>
              {extraCount}{" "}
              {extraCount === 1
                ? "foto adicional"
                : "fotos adicionais"}
            </strong>

            <span>
              {formatCurrency(
                extraAmount
              )}
            </span>

          </div>
        )}

        {selectionFinished && (
          <div className="selection-finished-message">

            <strong>
              Seleção enviada
            </strong>

            <span>
              O fotógrafo já recebeu
              suas escolhas.
            </span>

          </div>
        )}

        {proofs.length === 0 ? (
          <div className="client-gallery-empty">
            Nenhuma fotografia disponível.
          </div>
        ) : (
          <div className="client-photo-grid">

            {proofs.map(
              (photo) => (

                <article
                  key={photo.id}
                  className={
                    `client-photo ${
                      photo.selected
                        ? "is-selected"
                        : ""
                    }`
                  }
                >

                  <img
                    src={photo.url}
                    alt={
                      photo.fileName ||
                      ""
                    }
                    draggable="false"
                    loading="lazy"
                    onContextMenu={
                      (event) =>
                        event.preventDefault()
                    }
                    onClick={() =>
                      setExpandedPhoto(
                        photo
                      )
                    }
                  />

                  <button
                    type="button"
                    className="favorite-button"
                    disabled={
                      selectionFinished
                    }
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      toggleFavorite(
                        photo
                      );
                    }}
                  >
                    {photo.selected
                      ? "♥"
                      : "♡"}
                  </button>

                </article>

              )
            )}

          </div>
        )}

      </main>

      <div className="client-selection-bar">

        <div>

          <strong>
            {selectedCount}
          </strong>

          <span>
            {" "}
            selecionadas
          </span>

          {extraCount > 0 && (
            <small>
              +{" "}
              {formatCurrency(
                extraAmount
              )}
            </small>
          )}

        </div>

        <button
          type="button"
          disabled={
            selectedCount === 0 ||
            selectionFinished
          }
          onClick={() =>
            setShowFinalizeModal(
              true
            )
          }
        >
          {selectionFinished
            ? "Seleção enviada"
            : "Finalizar seleção"}
        </button>

      </div>

      {/* ============================
          LIGHTBOX
      ============================ */}

      {expandedPhoto && (
        <div
          className="gallery-lightbox"
          onClick={() =>
            setExpandedPhoto(
              null
            )
          }
          onContextMenu={
            (event) =>
              event.preventDefault()
          }
        >

          <button
            type="button"
            className="lightbox-close"
            onClick={() =>
              setExpandedPhoto(
                null
              )
            }
          >
            ×
          </button>

          <div
            className="lightbox-content"
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >

            <img
              src={
                expandedPhoto.url
              }
              alt=""
              draggable="false"
              onContextMenu={
                (event) =>
                  event.preventDefault()
              }
            />

            <div className="lightbox-protection-layer" />

            <button
              type="button"
              className={
                `lightbox-favorite ${
                  expandedPhoto.selected
                    ? "selected"
                    : ""
                }`
              }
              disabled={
                selectionFinished
              }
              onClick={() =>
                toggleFavorite(
                  expandedPhoto
                )
              }
            >
              {expandedPhoto.selected
                ? "♥ Selecionada"
                : "♡ Selecionar"}
            </button>

          </div>

        </div>
      )}

      {/* ============================
          MODAL FOTO EXTRA
      ============================ */}

      {extraPhotoCandidate && (
        <div
          className="gallery-modal-backdrop"
          onClick={() =>
            setExtraPhotoCandidate(
              null
            )
          }
        >

          <div
            className="gallery-modal"
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >

            <div className="gallery-modal-icon">
              +
            </div>

            <h3>
              Adicionar foto extra?
            </h3>

            <p>
              Seu pacote inclui{" "}
              <strong>
                {selectionLimit}
              </strong>{" "}
              fotos.
            </p>

            {extraPhotoPrice > 0 ? (
              <p>
                Cada fotografia
                adicional custa{" "}
                <strong>
                  {formatCurrency(
                    extraPhotoPrice
                  )}
                </strong>
                .
              </p>
            ) : (
              <p>
                O fotógrafo não definiu
                um valor para fotos
                adicionais.
              </p>
            )}

            <div className="gallery-modal-actions">

              <button
                type="button"
                className="gallery-modal-secondary"
                onClick={() =>
                  setExtraPhotoCandidate(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="gallery-modal-primary"
                onClick={async () => {
                  const photo =
                    extraPhotoCandidate;

                  setExtraPhotoCandidate(
                    null
                  );

                  await toggleFavorite(
                    photo,
                    true
                  );
                }}
              >
                {extraPhotoPrice > 0
                  ? `Adicionar por ${formatCurrency(
                      extraPhotoPrice
                    )}`
                  : "Adicionar foto"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================
          FINALIZAR SELEÇÃO
      ============================ */}

      {showFinalizeModal && (
        <div className="gallery-modal-backdrop">

          <div className="gallery-modal">

            <div className="gallery-modal-icon">
              ✓
            </div>

            <h3>
              Finalizar seleção?
            </h3>

            <p>
              Você selecionou{" "}
              <strong>
                {selectedCount}
              </strong>{" "}
              fotografias.
            </p>

            <p>
              Seu pacote inclui{" "}
              <strong>
                {selectionLimit}
              </strong>
              .
            </p>

            {extraCount > 0 && (
              <div className="final-extra-summary">

                <strong>
                  {extraCount}{" "}
                  {extraCount === 1
                    ? "foto adicional"
                    : "fotos adicionais"}
                </strong>

                <span>
                  Total adicional:
                  {" "}
                  {formatCurrency(
                    extraAmount
                  )}
                </span>

              </div>
            )}

            <p>
              Depois de confirmar,
              sua seleção será enviada
              ao fotógrafo.
            </p>

            <div className="gallery-modal-actions">

              <button
                type="button"
                className="gallery-modal-secondary"
                disabled={
                  finalizing
                }
                onClick={() =>
                  setShowFinalizeModal(
                    false
                  )
                }
              >
                Continuar escolhendo
              </button>

              <button
                type="button"
                className="gallery-modal-primary"
                disabled={
                  finalizing
                }
                onClick={
                  finalizeSelection
                }
              >
                {finalizing
                  ? "Enviando..."
                  : "Confirmar seleção"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function formatCurrency(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

export default ClientPrivateGallery;