import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaUser, FaShieldAlt } from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Login.css";


function Login() {


  const navigate = useNavigate();


  // ✅ role selector
  const [role, setRole] = useState("resident");


  // ✅ login form data
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });


  // ✅ handle input change
  const handleChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };


 // ✅ submit login
  const handleSubmit = async (e) => {
    e.preventDefault();

    // prevent empty fields
    if (!loginData.email || !loginData.password) {
      alert("Please enter email and password");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...loginData,
          role
        })
      });

      // safe json parse
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok) {
        alert("Login successful!");

        // save user session
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
       const userRole = String(data.user?.role || "").toLowerCase();
        const mustChangePassword = Boolean(data.user?.mustChangePassword);

        // ✅ Check if need to change password
        if (mustChangePassword) {
          navigate("/force-change-password");
          return;
        }

        // role based redirect
        if (userRole === "superadmin") {
          navigate("/superadmin");
        } else if (userRole === "staff") {
          navigate("/staff");
        } else if (userRole === "resident") {
          navigate("/resident/dashboard");
        } else {
          alert("Unknown role detected");
          navigate("/");
        }
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
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
            <span className="secure-badge">Secure Portal</span>
            <h1>
              Welcome to <strong>Barangay <span>Portal</span></strong>
            </h1>
            <p>
              Sign in to access personalized services and community updates.
            </p>
          </div>
        </div>


        {/* RIGHT PANEL */}
        <div className="auth-right">
          <div className="auth-card">


            <h2><FaLock /> Log In</h2>
            <p className="muted">Enter your credentials to continue</p>


            {/* ROLE SELECTOR */}
            <div className="role-tabs">


              <button
                type="button"
                className={`role ${role === "resident" ? "active" : ""}`}
                onClick={() => setRole("resident")}
              >
                <FaUser /> Resident
              </button>


              <button
                type="button"
                className={`role ${role === "staff" ? "active" : ""}`}
                onClick={() => setRole("staff")}
              >
                <FaShieldAlt /> Staff
              </button>


              <button
                type="button"
                className={`role ${role === "superadmin" ? "active" : ""}`}
                onClick={() => setRole("superadmin")}
              >
                <FaShieldAlt /> Super Admin
              </button>


            </div>


            {/* LOGIN FORM */}
            <form className="auth-form" onSubmit={handleSubmit}>


              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  onChange={handleChange}
                />
              </div>


              <div className="input-group">
                <FaLock className="input-icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  required
                  onChange={handleChange}
                />
              </div>


              <div className="form-row">
                <label className="checkbox">
                  <input type="checkbox" /> Remember me
                </label>


                <Link to="#" className="forgot">
                  Forgot password?
                </Link>
              </div>


              <button className="auth-submit">
                {role === "resident"
                  ? "Log In as Resident"
                  : role === "staff"
                  ? "Log In as Staff"
                  : "Log In as Super Admin"}
              </button>


              <div className="divider">
                Don't have an account?
                <Link to="/register"> Register here</Link>
              </div>


            </form>


          </div>
        </div>


      </main>


      <Footer />
    </>
  );
}


export default Login;
