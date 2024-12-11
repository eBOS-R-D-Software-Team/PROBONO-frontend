import React from "react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Logo from "../assets/images/PB_logo_org.png";
import { updateEmail, updatePassword, onLoggedin } from "../actions/LoginAction";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [isLoad, setIsLoad] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const email = useSelector((state) => state.login.email);
  const password = useSelector((state) => state.login.password);

  useEffect(() => {
    setTimeout(() => {
      setIsLoad(false);
    }, 500);
    if (localStorage.getItem("isLoggedIn") === "true") {
      navigate("/home");
    }
  }, [navigate]);


  const handleEmailChange = (e) => {
    dispatch(updateEmail(e.target.value));
  };

  const handlePasswordChange = (e) => {
    dispatch(updatePassword(e.target.value));
  };

  const handleLogin = (e) => {
    e.preventDefault(); // Prevent default form submission
    console.log("Attempting login..."); // Debug log
    dispatch(onLoggedin())
      .then(() => {
        console.log("Login successful, navigating to home..."); // Debug log
        navigate("/", { replace: true });
      })
      .catch((error) => {
        console.error("Login failed:", error); // Debug log
        alert("Wrong Email or password. Please try again.");
      });
  };

  return (
    <div className="theme-cyan">
           <div
        className="page-loader-wrapper"
        style={{ display: isLoad ? "block" : "none" }}
      >
        <div className="loader">
          <div className="m-t-30">
            <img
              src={require("../assets/images/PB_logo_blk.png")}
              width="200"
              height="200"
              alt="Lucid"
            />
          </div>
          <p>Please wait...</p>
        </div>
      </div>
      <div className="hide-border">
        <div className="vertical-align-wrap">
          <div className="vertical-align-middle auth-main">
            <div className="auth-box">
              <div className="top">
                <img
                  src={Logo}
                  alt="Lucid"
                  style={{ height: "40px", margin: "10px" }}
                />
              </div>
              <div className="card">
                <div className="header">
                  <p className="lead">Login to the dashboard</p>
                </div>
                <div className="body">
                  <form onSubmit={handleLogin} className="form-auth-small">
                    <div className="form-group">
                      <label className="control-label sr-only" htmlFor="signin-email">Email</label>
                      <input
                        className="form-control"
                        id="signin-email"
                        name="email"
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="control-label sr-only" htmlFor="signin-password">Password</label>
                      <input
                        className="form-control"
                        id="signin-password"
                        name="password"
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <div className="form-group clearfix">
                      <label className="fancy-checkbox element-left">
                        <input type="checkbox" />
                        <span>Remember me</span>
                      </label>
                    </div>
                    <button className="btn btn-primary btn-lg btn-block" type="submit" >
                      Login
                    </button>
                    <div className="bottom">
                      <span className="helper-text m-b-10">
                        <i className="fa fa-lock"></i>{" "}
                        <a href={`${process.env.PUBLIC_URL}/forgotpassword`}>
                          Forgot password?
                        </a>
                      </span>
                      <span>
                        Don't have an account?{" "}
                        <a href="registration">Register</a>
                      </span>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Login);
