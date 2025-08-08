import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import AuthHeader from '../../components/AuthHeader.jsx';

const API_CONFIG = {
    BASE_URL: 'https://',
    API_KEY: '28c033064e08.ngrok-free.app/',
    ENDPOINTS: {
        LOGIN: '/login',
    },
};

const GOOGLE_CLIENT_ID = '425235525504-9omkoda54r58dusqk1hgpd5co2irrrv8.apps.googleusercontent.com';

const SignIn = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: 'balamia@gmail.com',
        password: '',
    });

    const [formErrors, setFormErrors] = useState({
        email: '',
        password: '',
    });

    const [status, setStatus] = useState({
        isLoading: false,
        isSuccess: false,
        error: null,
    });

    const validateForm = () => {
        let isValid = true;
        const newErrors = { email: '', password: '' };

        if (!formData.email) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
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
                [name]: '',
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
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 401 ? 'Invalid email or password' : 'Login failed',
                );
            }

            const data = await response.json();
            setStatus({
                isLoading: false,
                isSuccess: true,
                error: null,
            });

            navigate('/');
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

        fetch(`${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.LOGIN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: 'google',
                token: credentialResponse.credential,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                setStatus({
                    isLoading: false,
                    isSuccess: true,
                    error: null,
                });
                navigate('/');
            })
            .catch((error) => {
                setStatus({
                    isLoading: false,
                    isSuccess: false,
                    error: 'Google login failed',
                });
            });
    };

    const handleGoogleError = () => {
        setStatus({
            isLoading: false,
            isSuccess: false,
            error: 'Google authentication failed. Please try again.',
        });
    };

    const handleRegisterRedirect = (e) => {
        e.preventDefault();
        navigate('/register');
    };

    return (
        <>
            <AuthHeader logoSrc="/logo.png" homeHref="/" />

            <main
                className="
                  pt-16 md:pt-20
                  min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)]
                  grid grid-cols-1 md:grid-cols-2
                  overflow-hidden
                "
            >
                <aside className="hidden md:block">
                    <img
                        src="/auth-background.png"
                        alt="Auth background"
                        className="object-cover w-full h-full"
                    />
                </aside>

                <section
                    className="
                        bg-black bg-opacity-60
                        flex items-center justify-center
                        px-4 sm:px-6 lg:pr-10 2xl:pr-12 lg:pl-8 py-6 md:py-8
                    "
                >
                    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8 md:mb-10 text-gray-800">
                            Welcome Back
                        </h2>

                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className={`w-full h-12 px-4 border-2 ${
                                        formErrors.email ? 'border-red-500' : 'border-[#66cc33]'
                                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.email && (
                                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full h-12 px-4 border-2 ${
                                        formErrors.password ? 'border-red-500' : 'border-[#66cc33]'
                                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.password && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors.password}
                                    </p>
                                )}
                                <div className="text-right mt-1">
                                    <button
                                        type="button"
                                        onClick={() => {}}
                                        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status.isLoading}
                                className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                            >
                                {status.isLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="flex items-center my-6">
                            <div className="flex-grow h-px bg-gray-300"></div>
                            <span className="px-3 text-gray-500 text-sm uppercase">or</span>
                            <div className="flex-grow h-px bg-gray-300"></div>
                        </div>

                        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                            <button
                                onClick={() => {}}
                                disabled={status.isLoading}
                                className="w-full h-12 flex items-center justify-center gap-3 border-2 border-[#66cc33] rounded-lg bg-white text-[#66cc33] hover:bg-[#f0fff0] transition cursor-pointer"
                            >
                                <FcGoogle className="text-xl" />
                                <span className="font-medium">Sign in with Google</span>
                            </button>
                        </GoogleOAuthProvider>

                        <p className="mt-8 text-center text-sm text-gray-600">
                            Don't have an account?{' '}
                            <button
                                onClick={handleRegisterRedirect}
                                className="text-[#66cc33] font-semibold hover:underline cursor-pointer"
                            >
                                Register
                            </button>
                        </p>

                        {status.error && (
                            <p className="text-red-500 text-center text-sm mt-4">{status.error}</p>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
};

export default SignIn;
