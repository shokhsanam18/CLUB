import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import AuthHeader from '../../components/AuthHeader.jsx';

const API_CONFIG = {
    BASE_URL: 'https://',
    API_KEY: '28c033064e08.ngrok-free.app/',
    ENDPOINTS: {
        REGISTER: '/users',
    },
};

const GOOGLE_CLIENT_ID = '425235525504-9omkoda54r58dusqk1hgpd5co2irrrv8.apps.googleusercontent.com';

const Registration = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
    });

    const [formErrors, setFormErrors] = useState({
        name: '',
        surname: '',
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
        const newErrors = { name: '', surname: '', email: '', password: '' };

        if (!formData.name) {
            newErrors.name = 'Name is required';
            isValid = false;
        }
        if (!formData.surname) {
            newErrors.surname = 'Surname is required';
            isValid = false;
        }
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
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
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
                `${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.REGISTER}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        surname: formData.surname,
                        email: formData.email,
                        password: formData.password,
                        createdAt: new Date().toISOString(),
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 409 ? 'User already exists' : 'Registration failed',
                );
            }

            const data = await response.json();
            setStatus({
                isLoading: false,
                isSuccess: true,
                error: null,
            });
            setFormData({ email: '', password: '' });

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

        fetch(`${API_CONFIG.BASE_URL}/${API_CONFIG.API_KEY}${API_CONFIG.ENDPOINTS.REGISTER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: 'google',
                token: credentialResponse.credential,
                createdAt: new Date().toISOString(),
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
                    error: 'Google registration failed',
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

    const handleLoginRedirect = (e) => {
        e.preventDefault();
        navigate('/login'); // Redirect to login page
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
                <section
                    className="
                        order-2 md:order-1
                        bg-black bg-opacity-60
                        flex items-center justify-center
                        px-4 sm:px-6 lg:pl-10 2xl:pl-12 lg:pr-8 py-6 md:py-8
                    "
                >
                    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8 text-gray-800">
                            Create an Account
                        </h2>

                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name
                                </label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full h-12 px-4 border-2 ${
                                        formErrors.name ? 'border-red-500' : 'border-[#66cc33]'
                                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.name && (
                                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Surname
                                </label>
                                <input
                                    name="surname"
                                    value={formData.surname}
                                    onChange={handleChange}
                                    className={`w-full h-12 px-4 border-2 ${
                                        formErrors.surname ? 'border-red-500' : 'border-[#66cc33]'
                                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.surname && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors.surname}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
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
                                    className={`w-full h-12 px-4 border-2 ${
                                        formErrors.password ? 'border-red-500' : 'border-[#66cc33]'
                                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.password && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors.password}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                                disabled={status.isLoading}
                            >
                                {status.isLoading ? 'Processing...' : 'Create Account'}
                            </button>

                            {status.error && (
                                <p className="text-red-500 text-center text-sm mt-4">
                                    {status.error}
                                </p>
                            )}
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <button
                                onClick={handleLoginRedirect}
                                className="text-[#66cc33] font-medium hover:underline cursor-pointer"
                            >
                                Log In
                            </button>
                        </div>
                    </div>
                </section>

                <aside className="hidden md:block order-1 md:order-2">
                    <img
                        src="/auth-background.png"
                        alt="Auth background"
                        className="object-cover w-full h-full"
                    />
                </aside>
            </main>
        </>
    );
};

export default Registration;
