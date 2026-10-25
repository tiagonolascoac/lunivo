import React, {
  useEffect,
  useState,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import {
  deleteObject,
  getDownloadURL,
  ref,
} from "firebase/storage";

import {
  db,
  storage,
} from "../../services/firebase";

import "./PrivateJobPhotos.css";

function PrivateJobPhotos({
  jobId,
  refreshKey = 0,
}) {
  const [photos, setPhotos] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectionMode, setSelectionMode] =
    useState(false);

  const [selectedPhotos, setSelectedPhotos] =
    useState([]);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [showBulkDeleteModal, setShowBulkDeleteModal] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, refreshKey]);

  async function loadPhotos() {
    try {
      setLoading(true);
      setError("");

      const photosRef = collection(
        db,
        "privateJobs",
        jobId,
        "photos"
      );

      const photosQuery = query(
        photosRef,
        orderBy("createdAt", "desc")
      );

      const snapshot =
        await getDocs(photosQuery);

      const loadedPhotos =
        await Promise.all(
          snapshot.docs.map(
            async (photoDocument) => {
              const data =
                photoDocument.data();

              try {
                const displayPath =
                  data.previewStoragePath ||
                  data.originalStoragePath ||
                  data.storagePath;

                const url =
                  await getDownloadURL(
                  ref(
                    storage,
                    displayPath
                  )
                );

                return {
                  id: photoDocument.id,
                  ...data,
                  url,
                };
              } catch (imageError) {
                console.error(
                  "Erro ao carregar imagem:",
                  imageError
                );

                return {
                  id: photoDocument.id,
                  ...data,
                  url: null,
                };
              }
            }
          )
        );

      setPhotos(loadedPhotos);
    } catch (loadError) {
      console.error(
        "Erro ao carregar fotos:",
        loadError
      );

      setError(
        "Não foi possível carregar as fotos deste trabalho."
      );
    } finally {
      setLoading(false);
    }
  }

  function startSelectionMode() {
    setSelectionMode(true);
    setSelectedPhotos([]);
  }

  function cancelSelectionMode() {
    setSelectionMode(false);
    setSelectedPhotos([]);
  }

  function togglePhotoSelection(photoId) {
    setSelectedPhotos((current) => {
      if (current.includes(photoId)) {
        return current.filter(
          (id) => id !== photoId
        );
      }

      return [
        ...current,
        photoId,
      ];
    });
  }

  function toggleSelectAll() {
    if (
      selectedPhotos.length ===
      photos.length
    ) {
      setSelectedPhotos([]);
      return;
    }

    setSelectedPhotos(
      photos.map(
        (photo) => photo.id
      )
    );
  }

  async function deletePhoto(
  photo
) {
  const paths = [
    photo.originalStoragePath,
    photo.previewStoragePath,

    /*
      Compatibilidade com as fotos
      antigas da LUNIVO.
    */
    photo.storagePath,
  ].filter(Boolean);

  const uniquePaths =
    [...new Set(paths)];

  for (
    const storagePath of uniquePaths
  ) {
    try {
      await deleteObject(
        ref(
          storage,
          storagePath
        )
      );
    } catch (deleteError) {
      if (
        deleteError.code !==
        "storage/object-not-found"
      ) {
        throw deleteError;
      }
    }
  }

  const photoRef =
    doc(
      db,
      "privateJobs",
      jobId,
      "photos",
      photo.id
    );

  await deleteDoc(
    photoRef
  );
}

  async function confirmSingleDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await deletePhoto(
        deleteTarget
      );

      setPhotos(
        (current) =>
          current.filter(
            (photo) =>
              photo.id !==
              deleteTarget.id
          )
      );

      setDeleteTarget(null);
    } catch (deleteError) {
      console.error(
        "Erro ao excluir foto:",
        deleteError
      );

      setError(
        "Não foi possível excluir esta foto."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    if (
      selectedPhotos.length === 0
    ) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const photosToDelete =
        photos.filter(
          (photo) =>
            selectedPhotos.includes(
              photo.id
            )
        );

      /*
        Promise.allSettled permite continuar mesmo
        caso uma foto específica apresente erro.
      */

      const results =
        await Promise.allSettled(
          photosToDelete.map(
            (photo) =>
              deletePhoto(photo)
          )
        );

      const deletedIds = [];

      let failures = 0;

      results.forEach(
        (result, index) => {
          if (
            result.status ===
            "fulfilled"
          ) {
            deletedIds.push(
              photosToDelete[index].id
            );
          } else {
            failures += 1;

            console.error(
              "Erro ao excluir:",
              photosToDelete[index],
              result.reason
            );
          }
        }
      );

      setPhotos(
        (current) =>
          current.filter(
            (photo) =>
              !deletedIds.includes(
                photo.id
              )
          )
      );

      setSelectedPhotos([]);

      setShowBulkDeleteModal(false);

      if (failures === 0) {
        setSelectionMode(false);
      } else {
        setError(
          `${failures} ${
            failures === 1
              ? "foto não pôde"
              : "fotos não puderam"
          } ser excluída${
            failures === 1
              ? ""
              : "s"
          }.`
        );
      }
    } catch (deleteError) {
      console.error(
        "Erro na exclusão em massa:",
        deleteError
      );

      setError(
        "Não foi possível concluir a exclusão."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="photos-loading">
        Carregando fotos...
      </div>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const allSelected =
    photos.length > 0 &&
    selectedPhotos.length ===
      photos.length;

  return (
    <>
      <section className="job-photos-section">
        <div className="job-photos-header">
          <div>
            <span className="dashboard-eyebrow">
              Provas
            </span>

            <h2>
              Fotos do trabalho
            </h2>
          </div>

          {!selectionMode ? (
            <div className="photo-header-actions">
              <span className="photo-count">
                {photos.length}{" "}
                {photos.length === 1
                  ? "foto"
                  : "fotos"}
              </span>

              <button
                type="button"
                className="photo-select-button"
                onClick={
                  startSelectionMode
                }
              >
                Selecionar
              </button>
            </div>
          ) : (
            <div className="bulk-actions">
              <span className="bulk-selected-count">
                {selectedPhotos.length}{" "}
                selecionada
                {selectedPhotos.length === 1
                  ? ""
                  : "s"}
              </span>

              <button
                type="button"
                className="bulk-secondary-button"
                onClick={
                  toggleSelectAll
                }
              >
                {allSelected
                  ? "Desmarcar todas"
                  : "Selecionar todas"}
              </button>

              <button
                type="button"
                className="bulk-cancel-button"
                onClick={
                  cancelSelectionMode
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="bulk-delete-button"
                disabled={
                  selectedPhotos.length === 0
                }
                onClick={() =>
                  setShowBulkDeleteModal(
                    true
                  )
                }
              >
                🗑
                <span>
                  Excluir
                </span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="photo-delete-error">
            {error}
          </div>
        )}

        <div className="private-photo-grid">
          {photos.map((photo) => {
            const selected =
              selectedPhotos.includes(
                photo.id
              );

            return (
              <article
                className={
                  `private-photo-card ${
                    selected
                      ? "photo-selected"
                      : ""
                  }`
                }
                key={photo.id}
                onClick={() => {
                  if (
                    selectionMode
                  ) {
                    togglePhotoSelection(
                      photo.id
                    );
                  }
                }}
              >
                <div className="photo-image-wrapper">
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={
                        photo.fileName
                      }
                      loading="lazy"
                      draggable="false"
                    />
                  ) : (
                    <div className="photo-error">
                      Imagem indisponível
                    </div>
                  )}

                  {selectionMode && (
                    <div
                      className={
                        `photo-selection-check ${
                          selected
                            ? "selected"
                            : ""
                        }`
                      }
                    >
                      {selected
                        ? "✓"
                        : ""}
                    </div>
                  )}

                  {!selectionMode && (
                    <button
                      type="button"
                      className="photo-delete-button"
                      title="Excluir foto"
                      onClick={
                        (event) => {
                          event.stopPropagation();

                          setDeleteTarget(
                            photo
                          );
                        }
                      }
                    >
                      🗑
                    </button>
                  )}
                </div>

                <div className="photo-card-footer">
                  <span
                    title={
                      photo.fileName
                    }
                  >
                    {photo.fileName}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {deleteTarget && (
        <div
          className="lunivo-modal-backdrop"
          onMouseDown={() => {
            if (!deleting) {
              setDeleteTarget(
                null
              );
            }
          }}
        >
          <div
            className="lunivo-modal"
            onMouseDown={
              (event) =>
                event.stopPropagation()
            }
          >
            <div className="modal-danger-icon">
              🗑
            </div>

            <h3>
              Excluir esta foto?
            </h3>

            <p>
              <strong>
                {
                  deleteTarget.fileName
                }
              </strong>{" "}
              será removida
              permanentemente deste
              trabalho.
            </p>

            <div className="lunivo-modal-actions">
              <button
                type="button"
                className="modal-cancel-button"
                disabled={deleting}
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="modal-delete-button"
                disabled={deleting}
                onClick={
                  confirmSingleDelete
                }
              >
                {deleting
                  ? "Excluindo..."
                  : "Excluir foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div
          className="lunivo-modal-backdrop"
          onMouseDown={() => {
            if (!deleting) {
              setShowBulkDeleteModal(
                false
              );
            }
          }}
        >
          <div
            className="lunivo-modal"
            onMouseDown={
              (event) =>
                event.stopPropagation()
            }
          >
            <div className="modal-danger-icon">
              🗑
            </div>

            <h3>
              Excluir{" "}
              {selectedPhotos.length}{" "}
              {selectedPhotos.length === 1
                ? "foto"
                : "fotos"}
              ?
            </h3>

            <p>
              As fotos selecionadas serão
              removidas permanentemente
              deste trabalho.
            </p>

            <p className="modal-warning">
              Esta ação não poderá ser
              desfeita.
            </p>

            <div className="lunivo-modal-actions">
              <button
                type="button"
                className="modal-cancel-button"
                disabled={deleting}
                onClick={() =>
                  setShowBulkDeleteModal(
                    false
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="modal-delete-button"
                disabled={deleting}
                onClick={
                  confirmBulkDelete
                }
              >
                {deleting
                  ? "Excluindo..."
                  : `Excluir ${selectedPhotos.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PrivateJobPhotos;