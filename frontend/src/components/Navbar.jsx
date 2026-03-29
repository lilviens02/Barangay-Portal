import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./Navbar.css";
import logo from "../assets/barangay-logo.png";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "navbar--solid" : ""}`}>
      <div className="container nav-inner">
        <div className="logo">
          <img src={logo} alt="Barangay Logo" />
        </div>

        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/announcements">Announcements</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </div>

        <div className="nav-actions">
          <NavLink to="/login" className="login-btn">Login</NavLink>
          <NavLink to="/register" className="register-btn">Register</NavLink>
        </div>

        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;