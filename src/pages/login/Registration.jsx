import React, { useState, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const API_CONFIG = {
  BASE_URL: "https://crudcrud.com/api",
  API_KEY: "b18d8562841048e8a70668e4f5864c45",
  ENDPOINTS: {
    REGISTER: "/users",
    LOGIN: "/login",
  },
};

const GOOGLE_CLIENT_ID =
  "425235525504-9omkoda54r58dusqk1hgpd5co2irrrv8.apps.googleusercontent.com";
const FACEBOOK_APP_ID = "ВАШ_FACEBOOK_APP_ID";

const Registration = () => {
  const [formData, setFormData] = useState({
    email: "balamia@gmail.com",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });

  const [status, setStatus] = useState({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v19.0",
        status: true,
      });
    };

    (function (d, s, id) {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      const js = d.createElement(s);
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");
  }, []);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: "", password: "" };

    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setFormErrors(newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus({
      isLoading: true,
      isSuccess: false,
      error: null,
    });

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.REGISTER}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            createdAt: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? "User already exists"
            : "Registration failed"
        );
      }

      const data = await response.json();
      setStatus({
        isLoading: false,
        isSuccess: true,
        error: null,
      });
      setFormData({ email: "", password: "" });
    } catch (error) {
      setStatus({
        isLoading: false,
        isSuccess: false,
        error: error.message,
      });
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    setStatus({
      isLoading: true,
      isSuccess: false,
      error: null,
    });

    fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.REGISTER}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          token: credentialResponse.credential,
          createdAt: new Date().toISOString(),
        }),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setStatus({
          isLoading: false,
          isSuccess: true,
          error: null,
        });
      })
      .catch((error) => {
        setStatus({
          isLoading: false,
          isSuccess: false,
          error: "Google registration failed",
        });
      });
  };

  const handleGoogleError = () => {
    setStatus({
      isLoading: false,
      isSuccess: false,
      error: "Google authentication failed. Please try again.",
    });
  };

  const handleFacebookLogin = () => {
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          setStatus({
            isLoading: true,
            isSuccess: false,
            error: null,
          });

          window.FB.api("/me", { fields: "name,email,picture" }, (userInfo) => {
            fetch(
              `${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.REGISTER}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  provider: "facebook",
                  token: response.authResponse.accessToken,
                  email: userInfo.email,
                  name: userInfo.name,
                  picture: userInfo.picture?.data?.url,
                  createdAt: new Date().toISOString(),
                }),
              }
            )
              .then((response) => response.json())
              .then((data) => {
                setStatus({
                  isLoading: false,
                  isSuccess: true,
                  error: null,
                });
              })
              .catch((error) => {
                setStatus({
                  isLoading: false,
                  isSuccess: false,
                  error: "Facebook registration failed",
                });
              });
          });
        } else {
          setStatus({
            isLoading: false,
            isSuccess: false,
            error: "Facebook login was cancelled",
          });
        }
      },
      { scope: "public_profile,email" }
    );
  };

  return (
    <div className="bg-black h-[100vh] fllex flex-row-reverse items-center justify-center gap-2">
      <div>
        <img />
      </div>
      <div>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <div className="max-w-md mx-auto p-8 bg-white rounded-lg">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              Create an account
            </h2>

            <div className="flex-row flex gap-3 mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                render={({ onClick }) => (
                  <button
                    type="button"
                    className="flex items-center justify-centerw w-1/2 gap-2 p-3 border border-green-500 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition "
                    onClick={onClick}
                    disabled={status.isLoading}
                  >
                    <FcGoogle className="text-xl" />
                    <span className="font-medium">Google</span>
                  </button>
                )}
              />

              <button
                type="button"
                className="flex items-center justify-center gap-2 p-3 border border-green-500 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition w-full"
                onClick={handleFacebookLogin}
                disabled={status.isLoading}
              >
                <FaFacebook className="text-xl text-blue-600" />
                <span className="font-medium">Facebook</span>
              </button>
            </div>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label className="block text-[#66cc33] text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-3 border ${
                    formErrors.email ? "border-red-500" : "border-[#66cc33]"
                  } rounded-md focus:outline-none focus:ring-1 focus:ring-[#66cc33]`}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-[#66cc33] text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`w-full p-3 border ${
                    formErrors.password ? "border-red-500" : "border-[#66cc33]"
                  } rounded-md focus:outline-none focus:ring-1 focus:ring-[#66cc33]`}
                  required
                  minLength="6"
                />
                <div className="text-right mt-1">
                  <a
                    href="#"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Forgot ?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#66cc33] text-white py-3 px-4 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={status.isLoading}
              >
                Create account
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already Have An Account ?{" "}
              <a
                href="#"
                className="text-[#66cc33] font-medium hover:underline"
              >
                Log In
              </a>
            </div>
          </div>
        </GoogleOAuthProvider>
      </div>
    </div>
  );
};

export default Registration;
