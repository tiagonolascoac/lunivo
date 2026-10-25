import React from "react";
import "./Home.css";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import ProtectedRoute from "./components/ProtectedRoute";

import PhotographerLayout from "./layouts/PhotographerLayout/PhotographerLayout";

import Dashboard from "./pages/photographer/Dashboard";

import PrivateJobs from "./pages/photographer/PrivateJobs";

import NewPrivateJob from "./pages/photographer/NewPrivateJob";

import PrivateJobDetails from "./pages/photographer/PrivateJobDetails";

import ClientPrivateGallery from "./pages/private-gallery/ClientPrivateGallery";
import ClientAlbum from "./pages/album/ClientAlbum";
import AlbumStudio from "./pages/photographer/AlbumStudio";


function Home() {
  return (
    <main className="lunivo-home">
      <header className="lunivo-home-header">
        <Link to="/" className="lunivo-home-logo" aria-label="LUNIVO, página inicial">
          <span className="lunivo-home-monogram">L</span>
          <span>LUNIVO</span>
        </Link>
        <nav className="lunivo-home-nav" aria-label="Navegação principal">
          <Link to="/login" className="lunivo-home-nav-link">Entrar</Link>
          <Link to="/cadastro" className="lunivo-home-nav-cta">Criar conta <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="lunivo-home-hero" aria-labelledby="lunivo-home-heading">
        <div className="lunivo-home-copy">
          <p className="lunivo-home-eyebrow"><span className="lunivo-home-eyebrow-line" /> UM NOVO OLHAR PARA SUAS MEMÓRIAS</p>
          <h1 id="lunivo-home-heading">Fotografias que merecem <em>ser lembradas.</em></h1>
          <p className="lunivo-home-description">
            Uma experiência especial para selecionar, organizar e receber as fotografias dos seus momentos mais importantes.
          </p>
          <div className="lunivo-home-actions">
            <Link to="/login" className="lunivo-home-button-primary">Acessar meu espaço <span aria-hidden="true">→</span></Link>
            <Link to="/cadastro" className="lunivo-home-button-secondary">Criar minha conta</Link>
          </div>
          <div className="lunivo-home-reassurance">
            <span className="lunivo-home-reassurance-mark" aria-hidden="true">✦</span>
            <span>Suas histórias, no seu próprio espaço.</span>
          </div>
        </div>
        <div className="lunivo-home-showcase" aria-hidden="true">
          <div className="lunivo-home-halo" />
          <div className="lunivo-home-frame lunivo-home-frame-back">
            <div className="lunivo-home-photo lunivo-home-photo-back" />
          </div>
          <div className="lunivo-home-frame lunivo-home-frame-front">
            <div className="lunivo-home-photo lunivo-home-photo-front">
              <div className="lunivo-home-art-horizon" />
              <div className="lunivo-home-art-sun" />
              <div className="lunivo-home-art-hill lunivo-home-art-hill-a" />
              <div className="lunivo-home-art-hill lunivo-home-art-hill-b" />
            </div>
            <div className="lunivo-home-frame-caption"><span>Memórias em imagens</span><span>01 / 03</span></div>
          </div>
          <div className="lunivo-home-floating-note">
            <span className="lunivo-home-floating-icon">✧</span>
            <span>Seu álbum, sua história.</span>
          </div>
        </div>
      </section>

      <section className="lunivo-home-bottom" aria-label="Benefícios da LUNIVO">
        <div><span className="lunivo-home-bottom-icon">01</span><strong>Selecione seus favoritos</strong><p>Escolha as imagens que contam sua história.</p></div>
        <div><span className="lunivo-home-bottom-icon">02</span><strong>Álbuns personalizados</strong><p>Uma apresentação à altura das suas memórias.</p></div>
        <div><span className="lunivo-home-bottom-icon">03</span><strong>Acesso privado</strong><p>Suas fotos em um espaço reservado para você.</p></div>
      </section>

      <footer className="lunivo-home-footer">
        <span>© {new Date().getFullYear()} LUNIVO</span>
        <span>Fotografia, memória e experiência.</span>
      </footer>
    </main>
  );
}


function Admin() {
  return (
    <h1>
      Administração LUNIVO
    </h1>
  );
}


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            ÁREA PÚBLICA
        ========================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/cadastro"
          element={<Register />}
        />


        {/* =========================
            GALERIA PRIVADA
        ========================= */}

        <Route
          path="/gallery/:jobId"
          element={
            <ClientPrivateGallery />
          }
        />


        <Route path="/gallery/:jobId/album" element={<ClientAlbum />} />

        {/* =========================
            PAINEL DO FOTÓGRAFO
        ========================= */}

        <Route
          path="/photographer"
          element={
            <ProtectedRoute
              allowedRoles={[
                "photographer",
                "admin",
              ]}
            >
              <PhotographerLayout />
            </ProtectedRoute>
          }
        >

          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="private-jobs"
            element={
              <PrivateJobs />
            }
          />

          <Route
            path="private-jobs/new"
            element={
              <NewPrivateJob />
            }
          />

          <Route path="private-jobs/:jobId/album" element={<AlbumStudio />} />

          <Route
            path="private-jobs/:jobId"
            element={
              <PrivateJobDetails />
            }
          />

        </Route>


        {/* =========================
            ADMIN
        ========================= */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
              ]}
            >
              <Admin />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;