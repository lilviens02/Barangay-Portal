import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt
} from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Register.css";

function Register() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    gender: "",
    birthdate: "",
    contact: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // submit register
  const handleSubmit = async (e) => {

    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {

      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful!");
        navigate("/login");
      } else {
        alert(data.message || "Registration failed");
      }

    } catch (error) {
      console.error(error);
      alert("Server error");
    }

  };

  return (
    <>
      <Navbar />

      <main className="auth-page page-with-navbar">

        {/* LEFT PANEL */}
        <div className="auth-left">
          <div className="auth-left-inner">
            <span className="secure-badge">New Account</span>
            <h1>
              Join <strong>Barangay <span>Portal</span></strong>
            </h1>
            <p>Register to access community services</p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right">
          <div className="auth-card">

            <h2>Register as Resident</h2>

            <form className="auth-form" onSubmit={handleSubmit}>

              {/* FIRST NAME */}
              <div className="input-group">
                <FaUser className="input-icon"/>
                <input
                  name="firstname"
                  placeholder="First Name *"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* MIDDLE NAME */}
              <div className="input-group">
                <FaUser className="input-icon"/>
                <input
                  name="middlename"
                  placeholder="Middle Name"
                  onChange={handleChange}
                />
              </div>

              {/* LAST NAME */}
              <div className="input-group">
                <FaUser className="input-icon"/>
                <input
                  name="lastname"
                  placeholder="Last Name *"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* GENDER */}
              <div className="input-group">
                <select
                  name="gender"
                  required
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* EMAIL */}
              <div className="input-group">
                <FaEnvelope className="input-icon"/>
                <input
                  type="email"
                  name="email"
                  placeholder="Email *"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* BIRTHDATE */}
              <div className="input-group">
                <FaCalendarAlt className="input-icon"/>
                <input
                  type="date"
                  name="birthdate"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* CONTACT */}
              <div className="input-group">
                <FaPhone className="input-icon"/>
                <input
                  name="contact"
                  placeholder="Contact Number *"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* ADDRESS */}
              <div className="input-group">
                <FaMapMarkerAlt className="input-icon"/>
                <input
                  name="address"
                  placeholder="Address *"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* PASSWORD */}
              <div className="input-group">
                <FaLock className="input-icon"/>
                <input
                  type="password"
                  name="password"
                  placeholder="Password *"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="input-group">
                <FaLock className="input-icon"/>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password *"
                  required
                  onChange={handleChange}
                />
              </div>

              <button className="auth-submit">
                Register
              </button>

              <div className="divider">
                Already have an account? <Link to="/login">Login</Link>
              </div>

            </form>

          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}

export default Register;