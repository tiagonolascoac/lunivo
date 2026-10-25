import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../../services/authService";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (form.password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      if (form.role === "photographer") {
        navigate("/photographer");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado.");
      } else if (err.code === "auth/invalid-email") {
        setError("Digite um e-mail válido.");
      } else if (err.code === "auth/weak-password") {
        setError("Escolha uma senha mais forte.");
      } else {
        setError("Não foi possível criar sua conta.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Criar conta na LUNIVO</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Nome</label>
          <br />
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>E-mail</label>
          <br />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Eu quero</label>
          <br />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="customer">
              Encontrar e comprar minhas fotos
            </option>

            <option value="photographer">
              Trabalhar como fotógrafo
            </option>
          </select>
        </div>

        <br />

        <div>
          <label>Senha</label>
          <br />

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Confirmar senha</label>
          <br />

          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        {error && <p>{error}</p>}

        <button disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p>
        Já possui uma conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}

export default Register;