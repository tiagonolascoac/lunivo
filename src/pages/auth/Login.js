import React, {
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./Auth.css";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  db,
} from "../../services/firebase";

import {
  loginUser,
} from "../../services/authService";

function Login() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const params =
    new URLSearchParams(
      location.search
    );

  /*
    Exemplo:

    /login?redirect=/gallery/ABC123

    Depois do login o usuário
    volta para /gallery/ABC123
  */
  const queryRedirect =
  params.get("redirect");

const storedRedirect =
  sessionStorage.getItem(
    "lunivo_redirect"
  );

const redirect =
  queryRedirect ||
  storedRedirect;

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");

    try {
      setLoading(true);

      const credential =
        await loginUser(
          email
            .trim()
            .toLowerCase(),
          password
        );

      /*
        Busca o perfil da pessoa
        no Firestore.
      */

      const userRef = doc(
        db,
        "users",
        credential.user.uid
      );

      const userSnapshot =
        await getDoc(userRef);

      if (
        !userSnapshot.exists()
      ) {
        throw new Error(
          "Perfil do usuário não encontrado."
        );
      }

      const profile =
        userSnapshot.data();

      if (
        profile.status !==
        "active"
      ) {
        throw new Error(
          "Usuário desativado."
        );
      }

      /*
        Se existe um redirect,
        ele tem prioridade.

        Isso é essencial para as
        galerias privadas.
      */

      if (
  redirect &&
  redirect.startsWith("/")
) {
  sessionStorage.removeItem(
    "lunivo_redirect"
  );

  navigate(
    redirect,
    {
      replace: true,
    }
  );

  return;
}

      /*
        Login comum:
        redirecionamento conforme perfil.
      */

      switch (
        profile.role
      ) {
        case "admin":
          navigate(
            "/admin",
            {
              replace: true,
            }
          );

          break;

        case "photographer":
          navigate(
            "/photographer",
            {
              replace: true,
            }
          );

          break;

        case "customer":
        default:
          navigate(
            "/",
            {
              replace: true,
            }
          );
      }
    } catch (err) {
      console.error(
        "Erro no login:",
        err
      );

      if (
        err.code ===
          "auth/invalid-credential" ||
        err.code ===
          "auth/user-not-found" ||
        err.code ===
          "auth/wrong-password"
      ) {
        setError(
          "E-mail ou senha incorretos."
        );
      } else if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Muitas tentativas de acesso. Aguarde alguns minutos."
        );
      } else if (
        err.message ===
        "Perfil do usuário não encontrado."
      ) {
        setError(
          "Sua conta existe, mas o perfil da LUNIVO não foi encontrado."
        );
      } else if (
        err.message ===
        "Usuário desativado."
      ) {
        setError(
          "Esta conta está desativada."
        );
      } else {
        setError(
          "Não foi possível entrar. Verifique seus dados."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lunivo-auth-page">
      <div className="lunivo-auth-feature">
        <Link to="/" className="lunivo-auth-brand"><span>L</span> LUNIVO</Link>
        <div className="lunivo-auth-feature-content">
          <small>UM ESPAÇO PARA BOAS HISTÓRIAS</small>
          <h1>Fotografias que viram <em>memórias.</em></h1>
          <p>Organize galerias, receba seleções e dê aos seus clientes uma experiência especial.</p>
          <span className="lunivo-auth-feature-line" />
        </div>
      </div>
      <main className="lunivo-auth-panel">
        <div className="lunivo-auth-form-wrap">
          <div className="lunivo-auth-kicker">BEM-VINDA À LUNIVO</div>
          <h2>Acesse seu espaço.</h2>
          <p>{redirect ? "Entre para visualizar sua galeria privada." : "Tudo pronto para continuar criando."}</p>
          <form onSubmit={handleSubmit} className="lunivo-auth-form">
            <label htmlFor="lunivo-email">Seu e-mail</label>
            <input id="lunivo-email" type="email" autoComplete="email" placeholder="voce@seuestudio.com"
              value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="lunivo-password">Sua senha</label>
            <input id="lunivo-password" type="password" autoComplete="current-password" placeholder="Digite sua senha"
              value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <p className="lunivo-auth-error" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="primary-button">{loading ? "Entrando..." : "Entrar na LUNIVO →"}</button>
          </form>
          <p className="lunivo-auth-register">Não possui uma conta? <Link to={redirect ? `/cadastro?redirect=${encodeURIComponent(redirect)}` : "/cadastro"}>Criar conta</Link></p>
        </div>
      </main>
    </div>
  );
}

export default Login;