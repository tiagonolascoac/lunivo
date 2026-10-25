import React, {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  db,
} from "../../services/firebase";

import {
  useAuth,
} from "../../contexts/AuthContext";

function NewPrivateJob() {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [form, setForm] =
    useState({
      title: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventType: "ensaio",
      eventDate: "",
      selectionLimit: 20,
      extraPhotoPrice: 0,
      notes: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (previous) => ({
        ...previous,

        [name]:
          value,
      })
    );
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const document =
        await addDoc(
          collection(
            db,
            "privateJobs"
          ),
          {
            photographerId:
              user.uid,

            title:
              form.title.trim(),

            clientName:
              form.clientName.trim(),

            clientEmail:
              form.clientEmail
                .trim()
                .toLowerCase(),

            clientPhone:
              form.clientPhone.trim(),

            eventType:
              form.eventType,

            eventDate:
              form.eventDate ||
              null,

            selectionLimit:
              Number(
                form.selectionLimit
              ) || 0,

            extraPhotoPrice:
              Number(
                form.extraPhotoPrice
              ) || 0,

            notes:
              form.notes.trim(),

            status:
              "draft",

            galleryPublished:
              false,

            access: {
              mode:
                "email_invite",

              invitedEmails: [
                form.clientEmail
                  .trim()
                  .toLowerCase(),
              ],
            },

            selectionStatus:
              "not_started",

            selectedCount:
              0,

            extraSelectedCount:
              0,

            extraAmount:
              0,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

      navigate(
        `/photographer/private-jobs/${document.id}`
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        "Não foi possível criar o trabalho."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-page">

      <header className="dashboard-header">

        <div>

          <span className="dashboard-eyebrow">
            Clientes privados
          </span>

          <h1>
            Novo trabalho
          </h1>

          <p>
            Crie uma sessão privada
            e prepare o acesso do
            cliente.
          </p>

        </div>

      </header>

      <form
        onSubmit={
          handleSubmit
        }
        style={{
          background:
            "#fff",

          border:
            "1px solid #e5e7ea",

          borderRadius:
            "18px",

          padding:
            "26px",

          maxWidth:
            "760px",
        }}
      >

        <div
          style={{
            marginBottom:
              "18px",
          }}
        >

          <label>
            Nome do trabalho
          </label>

          <input
            name="title"
            value={
              form.title
            }
            onChange={
              handleChange
            }
            placeholder="Ex: Ensaio Ana & Lucas"
            required
            style={
              inputStyle
            }
          />

        </div>

        <div
          style={
            gridStyle
          }
        >

          <div>

            <label>
              Nome do cliente
            </label>

            <input
              name="clientName"
              value={
                form.clientName
              }
              onChange={
                handleChange
              }
              required
              style={
                inputStyle
              }
            />

          </div>

          <div>

            <label>
              E-mail
            </label>

            <input
              name="clientEmail"
              type="email"
              value={
                form.clientEmail
              }
              onChange={
                handleChange
              }
              required
              style={
                inputStyle
              }
            />

          </div>

        </div>

        <div
          style={{
            ...gridStyle,

            marginTop:
              "18px",
          }}
        >

          <div>

            <label>
              Telefone
            </label>

            <input
              name="clientPhone"
              value={
                form.clientPhone
              }
              onChange={
                handleChange
              }
              style={
                inputStyle
              }
            />

          </div>

          <div>

            <label>
              Tipo de trabalho
            </label>

            <select
              name="eventType"
              value={
                form.eventType
              }
              onChange={
                handleChange
              }
              style={
                inputStyle
              }
            >

              <option value="ensaio">
                Ensaio
              </option>

              <option value="casamento">
                Casamento
              </option>

              <option value="formatura">
                Formatura
              </option>

              <option value="familia">
                Família
              </option>

              <option value="corporativo">
                Corporativo
              </option>

              <option value="outro">
                Outro
              </option>

            </select>

          </div>

        </div>

        <div
          style={{
            ...gridStyle,

            marginTop:
              "18px",
          }}
        >

          <div>

            <label>
              Data do trabalho
            </label>

            <input
              name="eventDate"
              type="date"
              value={
                form.eventDate
              }
              onChange={
                handleChange
              }
              style={
                inputStyle
              }
            />

          </div>

          <div>

            <label>
              Fotos incluídas no pacote
            </label>

            <input
              name="selectionLimit"
              type="number"
              min="0"
              value={
                form.selectionLimit
              }
              onChange={
                handleChange
              }
              style={
                inputStyle
              }
            />

          </div>

        </div>

        <div
          style={{
            marginTop:
              "18px",
          }}
        >

          <label>
            Valor por foto adicional
          </label>

          <input
            name="extraPhotoPrice"
            type="number"
            min="0"
            step="0.01"
            value={
              form.extraPhotoPrice
            }
            onChange={
              handleChange
            }
            placeholder="Ex: 15,00"
            style={
              inputStyle
            }
          />

          <small
            style={{
              display:
                "block",

              marginTop:
                "6px",

              color:
                "#8a8f96",
            }}
          >
            Quando o cliente selecionar
            mais fotos do que o pacote
            inclui, a LUNIVO mostrará
            este valor.
          </small>

        </div>

        <div
          style={{
            marginTop:
              "18px",
          }}
        >

          <label>
            Observações internas
          </label>

          <textarea
            name="notes"
            value={
              form.notes
            }
            onChange={
              handleChange
            }
            rows="5"
            style={{
              ...inputStyle,

              resize:
                "vertical",
            }}
          />

        </div>

        {error && (
          <p
            style={{
              color:
                "#b42318",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            marginTop:
              "24px",
          }}
        >

          <button
            className="primary-button"
            disabled={
              loading
            }
          >
            {loading
              ? "Criando..."
              : "Criar trabalho"}
          </button>

        </div>

      </form>

    </div>
  );
}

const inputStyle = {
  width: "100%",

  marginTop: "7px",

  padding:
    "12px 13px",

  borderRadius:
    "9px",

  border:
    "1px solid #d9dde2",

  fontSize:
    "14px",
};

const gridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",

  gap: "16px",
};

export default NewPrivateJob;