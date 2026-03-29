const Footer = () => {
  return (
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
  );
};

export default Footer;