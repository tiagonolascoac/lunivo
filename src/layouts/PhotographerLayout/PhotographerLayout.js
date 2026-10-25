import React, { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { logoutUser } from "../../services/authService";
import "./PhotographerLayout.css";

function PhotographerLayout() {
  const { userProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Campo opcional para futura personalização por estúdio.
  const customColor = userProfile?.brandColor;
  const primary = /^#[0-9a-fA-F]{6}$/.test(customColor || "")
    ? customColor : "#173c43";
  const closeMenu = () => setMenuOpen(false);
  return <div className="photographer-layout" style={{ "--lunivo-primary": primary }}>
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">L</div>
        <div className="brand-lockup"><strong className="brand-name">LUNIVO</strong><small>ESTÚDIO CRIATIVO</small></div>
        <button type="button" className="sidebar-close" aria-label="Fechar menu" onClick={closeMenu}>×</button>
      </div>
      <p className="sidebar-greeting">Seu espaço, suas histórias.</p>
      <nav className="sidebar-nav" aria-label="Menu principal">
        <div className="sidebar-section-title">PAINEL</div>
        <NavLink to="/photographer" end onClick={closeMenu}><span className="nav-symbol">◫</span>Visão geral</NavLink>
        <div className="sidebar-section-title">CLIENTES</div>
        <NavLink to="/photographer/private-jobs" end onClick={closeMenu}><span className="nav-symbol">▦</span>Trabalhos privados</NavLink>
        <NavLink to="/photographer/private-jobs/new" onClick={closeMenu}><span className="nav-symbol">＋</span>Novo trabalho</NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-help"><span>✦</span><strong>Sua galeria, com identidade.</strong><small>Organize, compartilhe e encante.</small></div>
        <div className="sidebar-user">
          <span className="sidebar-avatar">{(userProfile?.name || "F").charAt(0).toUpperCase()}</span>
          <div><strong>{userProfile?.name || "Fotógrafa"}</strong><small>{userProfile?.email || "Conta do estúdio"}</small></div>
        </div>
        <button type="button" className="logout-button" onClick={logoutUser}>Sair da conta <span>↗</span></button>
      </div>
    </aside>
    {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Fechar menu" onClick={closeMenu} />}
    <div className="photographer-shell">
      <header className="photographer-topbar">
        <button type="button" className="mobile-menu-button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>☰</button>
        <div className="topbar-breadcrumb">LUNIVO <span>/</span> Espaço da fotógrafa</div>
        <Link to="/photographer/private-jobs/new" className="topbar-action">＋ Novo trabalho</Link>
      </header>
      <main className="photographer-main"><Outlet /></main>
    </div>
  </div>;
}
export default PhotographerLayout;
