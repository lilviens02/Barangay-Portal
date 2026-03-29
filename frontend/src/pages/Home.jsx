import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import "./Home.css";


function Home() {
  return (
    <>
      <Navbar />
      <div className="page-with-navbar">
        <Hero />


        {/* CONTACT */}
        <section className="contact" id="contact">
          <div className="container contact-grid">
            <div className="contact-left">
              <h2>Need Assistance?</h2>
              <p>Our barangay staff is ready to help you with any questions or concerns.</p>


              <div className="contact-item">
                <strong>Visit Us</strong>
                <div>📍 Barangay Hall, [Street], Maynila</div>
              </div>


              <div className="contact-item">
                <strong>Call Us</strong>
                <div>📞 (02) 1234-5678 / 0912-345-6789</div>
              </div>


              <div className="contact-item">
                <strong>Email Us</strong>
                <div>✉ brgy.portal@example.ph</div>
              </div>
            </div>


            <div className="form-card contact-right">
              <h3>Send Us a Message</h3>
              <input placeholder="Your Name" />
              <input placeholder="Email Address" />
              <input placeholder="Subject" />
              <textarea placeholder="Your Message"></textarea>
              <button>Send Message</button>
            </div>
          </div>
        </section>


        {/* FOOTER */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <h4>Barangay Portal</h4>
                <p>The official digital services platform of Barangay 424 Zone 43, Maynila.</p>
              </div>
              <div>
                <h4>Services</h4>
                <p>Document Requests</p>
                <p>File Complaints</p>
                <p>Public Events</p>
                <p>Announcements</p>
              </div>
              <div>
                <h4>Information</h4>
                <p>Barangay Hall, [Street], Maynila</p>
                <p>(02) 1234-5678</p>
                <p>brgy.portal@example.ph</p>
                <p>Mon-Fri: 8:00 AM - 5:00 PM</p>
              </div>
              <div>
                <h4>Stay Updated</h4>
                <p>Subscribe to our newsletter for the latest announcements and updates.</p>
              </div>
            </div>


            <div className="footer-bottom">
              <div>© 2025 Barangay 424 Zone 43. All rights reserved.</div>
              <div>Privacy Policy | Terms of Service | Sitemap</div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}


export default Home;

