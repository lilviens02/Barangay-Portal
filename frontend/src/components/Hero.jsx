import { Link } from "react-router-dom";
import "./Hero.css";
import heroLogo from "../assets/barangaylogo.jpg";


const Hero = () => {
  return (
    <section className="hero">
      <div className="container hero-content">


        <div className="hero-logo">
          <img src={heroLogo} alt="Barangay Logo" />
        </div>


        <div className="hero-text">
          <span className="badge">E-Governance Portal</span>


          <h1>
            Barangay <span>Information</span> System
          </h1>


          <p className="hero-sub">
            Request documents, access announcements, and manage
            barangay services easily and securely online.
          </p>


          <div className="hero-buttons">
            <Link to="/login" className="btn-primary">
              Request Documents
            </Link>


            <Link to="/register" className="btn-secondary">
              Register Now
            </Link>
          </div>
        </div>


      </div>


      <div className="wave">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            fill="#ffffff"
            fillOpacity="1"
            d="M0,224L60,208C120,192,240,160,360,165.3C480,171,600,213,720,218.7C840,224,960,192,1080,176C1200,160,1320,160,1380,160L1440,160L1440,320L0,320Z"
          ></path>
        </svg>
      </div>


    </section>
  );
};


export default Hero;