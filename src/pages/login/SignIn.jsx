import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const API_CONFIG = {
  BASE_URL: "https://crudcrud.com/api",
  API_KEY: "32f289687e8d490281ac8d4d456f45c4",
  ENDPOINTS: {
    LOGIN: "/login",
  },
};

const GOOGLE_CLIENT_ID =
  "425235525504-9omkoda54r58dusqk1hgpd5co2irrrv8.apps.googleusercontent.com";

const SignIn = () => {
  const navigate = useNavigate();
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
        `${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.LOGIN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401 ? "Invalid email or password" : "Login failed"
        );
      }

      const data = await response.json();
      setStatus({
        isLoading: false,
        isSuccess: true,
        error: null,
      });

      navigate("/");
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
      `${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.LOGIN}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          token: credentialResponse.credential,
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
        navigate("/");
      })
      .catch((error) => {
        setStatus({
          isLoading: false,
          isSuccess: false,
          error: "Google login failed",
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

  const handleRegisterRedirect = (e) => {
    e.preventDefault();
    navigate("/register");
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
              Welcome back
            </h2>

            <div className="flex-row flex gap-3 mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                render={({ onClick }) => (
                  <button
                    type="button"
                    className="flex items-center justify-centerw w-full gap-2 p-3 border border-green-500 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition "
                    onClick={onClick}
                    disabled={status.isLoading}
                  >
                    <FcGoogle className="text-xl" />
                    <span className="font-medium">Google</span>
                  </button>
                )}
              />
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
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.email}
                  </p>
                )}
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
                />
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.password}
                  </p>
                )}
                <div className="text-right mt-1">
                  <a
                    href="#"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#66cc33] text-white py-3 px-4 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={status.isLoading}
              >
                {status.isLoading ? "Signing in..." : "Sign in"}
              </button>
              {status.error && (
                <p className="text-red-500 text-xs mt-2 text-center">
                  {status.error}
                </p>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={handleRegisterRedirect}
                className="text-[#66cc33] font-medium hover:underline bg-transparent border-none cursor-pointer"
              >
                Register
              </button>
            </div>
          </div>
        </GoogleOAuthProvider>
      </div>
    </div>
  );
};

export default SignIn;
