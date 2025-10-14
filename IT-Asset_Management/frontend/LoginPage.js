import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import config, { getEndpointUrl } from './config/config';

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [signInButtonHovered, setSignInButtonHovered] = useState(false);
    const [forgotButtonHovered, setForgotButtonHovered] = useState(false);

    // Forgot Password States - using your email form approach
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotStatus, setForgotStatus] = useState(''); // Changed from forgotError to forgotStatus

    // Screen size tracking
    const [screenSize, setScreenSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    const canvasRef = useRef(null);
    const mouse = useRef({ x: null, y: null, radius: 150 });
    const navigate = useNavigate();

    // Responsive breakpoints
    const isMobile = screenSize.width <= 768;
    const isTablet = screenSize.width > 768 && screenSize.width <= 1024;
    const isSmallMobile = screenSize.width <= 480;

    // Handle screen resize
    useEffect(() => {
        const handleResize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    // Canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particlesArray = [];

        const setCanvasSize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
            }
        };

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.baseSize = size;
                this.originalColor = color;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            update() {
                if (this.x + this.size > canvas.width || this.x - this.size < 0) this.directionX = -this.directionX;
                if (this.y + this.size > canvas.height || this.y - this.size < 0) this.directionY = -this.directionY;
                this.x += this.directionX;
                this.y += this.directionY;

                if (mouse.current.x && mouse.current.y) {
                    let dx = mouse.current.x - this.x;
                    let dy = mouse.current.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.current.radius + this.size) {
                        if (this.size < this.baseSize * 2) {
                            this.size += 0.5;
                        }
                    } else if (this.size > this.baseSize) {
                        this.size -= 0.1;
                    }
                } else if (this.size > this.baseSize) {
                    this.size -= 0.1;
                }
                this.draw();
            }
        }

        function init() {
            particlesArray = [];
            const numberOfParticles = isMobile ? 
                Math.min((canvas.width * canvas.height) / 15000, 20) : 
                Math.min((canvas.width * canvas.height) / 7000, 50);
            const baseColors = ['rgba(255, 255, 255, 0.5)', 'rgba(74, 144, 226, 0.6)', 'rgba(208, 2, 27, 0.6)'];

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 1.5) + 0.8;
                const x = (Math.random() * canvas.width);
                const y = (Math.random() * canvas.height);
                const directionX = (Math.random() * 0.6) - 0.3;
                const directionY = (Math.random() * 0.6) - 0.3;
                const color = baseColors[Math.floor(Math.random() * baseColors.length)];

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }
        function connect() {
            const maxDistance = isMobile ? 80 : 120;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    const dx = particlesArray[a].x - particlesArray[b].x;
                    const dy = particlesArray[a].y - particlesArray[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        let opacityValue = 1 - (distance / maxDistance);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue * 0.4})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesArray.forEach(p => p.update());
            if (!isMobile) connect();
            animationFrameId = requestAnimationFrame(animate);
        }

        const handleCanvasResize = () => {
            setCanvasSize();
            init();
        };
        const handleMouseMove = (event) => {
            if (!isMobile) {
                mouse.current.x = event.x;
                mouse.current.y = event.y;
            }
        };
        const handleMouseOut = () => {
            mouse.current.x = null;
            mouse.current.y = null;
        };
        setCanvasSize();
        init();
        animate();
        window.addEventListener('resize', handleCanvasResize);
        if (!isMobile) {
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseout', handleMouseOut);
        }

        return () => {
            window.removeEventListener('resize', handleCanvasResize);
            if (!isMobile) {
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('mouseout', handleMouseOut);
            }
            cancelAnimationFrame(animationFrameId);
        };
    }, [isMobile]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(`${getEndpointUrl('LOGIN')}`, { email, password });
            message.success('Login Successful!');
            onLogin(response.data);
        } catch (err) {
            const errorMessage = err.response?.data?.msg || 'Failed to login. Please check credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Forgot Password Functions - Updated to use your email sending approach
    const handleForgotPasswordClick = () => {
        setShowForgotModal(true);
        setForgotEmail('');
        setForgotStatus('');
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotEmail('');
        setForgotStatus('');
    };

    // Send password reset email using your email form approach
    // ...existing code...
const sendPasswordResetEmail = async () => {
    if (!forgotEmail) {
        setForgotStatus('Please enter your email address.');
        return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(forgotEmail)) {
        setForgotStatus('Please enter a valid email address.');
        return;
    }
    setForgotLoading(true);
    setForgotStatus('');
    try {
    await axios.post(`${getEndpointUrl('FORGOT_PASSWORD')}`, { email: forgotEmail });
        setForgotStatus("Reset link sent! Please check your email.");
        setTimeout(() => {
            closeForgotModal();
        }, 3000);
    } catch (error) {
        setForgotStatus("Error sending reset link: " + (error.response?.data?.message || error.message));
    } finally {
        setForgotLoading(false);
    }
};

    // Complete Responsive Styles
    const styles = {
        // Main container with proper viewport handling
        container: {
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            width: '100vw',
            height: '100vh',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
            fontFamily: "'Quicksand', sans-serif",
            position: 'fixed',
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box'
        },

        // Left panel
        leftPanel: {
            position: 'relative',
            flex: isMobile ? '0 0 35vh' : '1 1 50%',
            background: '#0d1a3a',
            overflow: 'hidden',
            minHeight: isMobile ? '35vh' : '100vh'
        },

        // Canvas
        canvas: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1
        },

        // Logo container
        logoContainer: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            textAlign: 'center',
            color: 'white',
            padding: isSmallMobile ? '15px' : '20px',
            width: '90%',
            maxWidth: '400px'
        },

        // Logo
        logo: {
            maxWidth: isSmallMobile ? '140px' : isMobile ? '180px' : '280px',
            width: '100%',
            height: 'auto',
            marginBottom: '10px',
            display: 'block'
        },

        // Subtitle
        subtitle: {
            color: '#FFFFFF',
            opacity: 0.8,
            fontSize: isSmallMobile ? '10px' : isMobile ? '12px' : '14px',
            fontWeight: '500',
            lineHeight: 1.3
        },

        // Right panel
        rightPanel: {
            flex: isMobile ? '1 1 65vh' : '1 1 50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#F1F1F1',
            padding: isSmallMobile ? '10px' : isMobile ? '15px' : '20px',
            boxSizing: 'border-box',
            overflow: 'auto'
        },

        // Form container
        formContainer: {
            backgroundColor: '#FFFFFF',
            padding: isSmallMobile ? '1.2rem' : isMobile ? '1.5rem' : '2.5rem',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: isSmallMobile ? '100%' : '400px',
            textAlign: 'center',
            boxSizing: 'border-box'
        },

        // Heading
        heading: {
            color: '#2C4B84',
            fontSize: isSmallMobile ? '14px' : isMobile ? '16px' : '18px',
            fontWeight: '700',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            margin: '0 0 2rem 0'
        },

        // Input container
        inputContainer: {
            marginBottom: '1.2rem',
            position: 'relative',
            textAlign: 'left'
        },

        // Label
        label: {
            display: 'block',
            textAlign: 'left',
            color: '#6C727F',
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '0.5rem'
        },

        // Input with focus styles
        input: {
            padding: isSmallMobile ? '10px 12px' : '12px 15px',
            width: '100%',
            height: isSmallMobile ? '40px' : '44px',
            borderRadius: '8px',
            border: '1px solid #D5D5D5',
            boxSizing: 'border-box',
            fontSize: '14px',
            color: '#000929',
            outline: 'none',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
        },

        // Password input with focus styles
        passwordInput: {
            padding: isSmallMobile ? '10px 40px 10px 12px' : '12px 45px 12px 15px',
            width: '100%',
            height: isSmallMobile ? '40px' : '44px',
            borderRadius: '8px',
            border: '1px solid #D5D5D5',
            boxSizing: 'border-box',
            fontSize: '14px',
            color: '#000929',
            outline: 'none',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
        },

        // Eye icon
        eyeIcon: {
            position: 'absolute',
            right: '15px',
            top: '70%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            color: '#6C727F',
            fontSize: '16px',
            zIndex: 2,
            padding: '2px'
        },

        // Error message
        error: {
            color: '#D5292B',
            fontSize: '12px',
            textAlign: 'center',
            margin: '0 0 1rem 0',
            minHeight: '15px'
        },

        // Status message (for forgot password)
        status: {
            fontSize: '12px',
            textAlign: 'center',
            margin: '0 0 1rem 0',
            minHeight: '15px',
            color: forgotStatus.includes('Error') ? '#D5292B' : '#52c41a'
        },

        // Primary button
        primaryButton: {
            width: '100%',
            padding: isSmallMobile ? '10px' : '12px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: signInButtonHovered ? '#1d54b8' : '#296bd5ff',
            color: 'white',
            fontSize: '14px',
            fontWeight: '700',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: isLoading ? 0.7 : 1
        },

        // Forgot password button
        forgotButton: {
            background: 'none',
            color: forgotButtonHovered ? '#1d54b8' : '#296bd5ff',
            border: 'none',
            cursor: 'pointer',
            marginTop: '1rem',
            fontSize: '13px',
            width: '100%',
            padding: '10px',
            transition: 'color 0.3s ease'
        },

        // Modal overlay with proper viewport coverage
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: 0,
            margin: 0,
            overflow: 'auto'
        },

        // Modal content with responsive dimensions
        modalContent: {
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            position: 'relative',
            boxSizing: 'border-box',
            margin: isMobile ? '10px' : '20px',
            
            // Responsive width and height
            width: isMobile ? 'calc(100vw - 20px)' : '90vw',
            maxWidth: isMobile ? '100%' : '500px',
            
            // Dynamic height based on content
            maxHeight: isMobile ? 'calc(100vh - 40px)' : '90vh',
            minHeight: 'auto',
            
            // Scrollable content
            overflowY: 'auto',
            overflowX: 'hidden',
            
            // Proper padding
            padding: isSmallMobile ? '1rem' : isMobile ? '1.5rem' : '2rem'
        },

        // Modal buttons
        modalCloseButton: {
            position: 'absolute',
            top: '10px',
            right: '15px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '28px',
            color: '#666',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            zIndex: 10,
            transition: 'background-color 0.3s ease'
        },

        // Content wrapper inside modal
        modalContentWrapper: {
            width: '100%',
            paddingTop: '40px',
            boxSizing: 'border-box'
        },

        required: {
            color: '#ff4d4f',
            marginLeft: '2px'
        }
    };

    return (
        <div style={styles.container}>
            {/* Embedded styles for focus */}
            <style>{`
                .login-input:focus {
                    border-color: #296bd5ff !important;
                    box-shadow: 0 0 0 2px rgba(41, 107, 213, 0.2) !important;
                }
                .login-password-input:focus {
                    border-color: #296bd5ff !important;
                    box-shadow: 0 0 0 2px rgba(41, 107, 213, 0.2) !important;
                }
            `}</style>

            {/* Left Panel */}
            <div style={styles.leftPanel}>
                <canvas ref={canvasRef} style={styles.canvas} />
                <div style={styles.logoContainer}>
                    <img
                        src={`${process.env.PUBLIC_URL}/C_lab logo.png`}
                        alt="Cirrus Labs Logo"
                        style={styles.logo}
                    />
                    <div style={styles.subtitle}>
                        IT Asset Management Dashboard
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div style={styles.rightPanel}>
                <div style={styles.formContainer}>
                    <h2 style={styles.heading}>IT Department Login</h2>
                    
                    <form onSubmit={handleLogin}>
                        {/* Email Field */}
                        <div style={styles.inputContainer}>
                            <label style={styles.label}>
                                Email Address<span style={styles.required}>*</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required={true}
                                style={styles.input}
                                className="login-input"
                            />
                        </div>

                        {/* Password Field */}
                        <div style={styles.inputContainer}>
                            <label style={styles.label}>
                                Password<span style={styles.required}>*</span>
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                style={styles.passwordInput}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required={true}
                                className="login-password-input"
                            />
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            </span>
                        </div>

                        <div style={styles.error}>{error}</div>
                        
                        <button
                            type="submit"
                            style={styles.primaryButton}
                            disabled={isLoading}
                            onMouseEnter={() => setSignInButtonHovered(true)}
                            onMouseLeave={() => setSignInButtonHovered(false)}
                        >
                            {isLoading ? 'Logging In...' : 'Login'}
                        </button>

                        <button
                            type="button"
                            onClick={handleForgotPasswordClick}
                            style={styles.forgotButton}
                            onMouseEnter={() => setForgotButtonHovered(true)}
                            onMouseLeave={() => setForgotButtonHovered(false)}
                        >
                            Forgot Password?
                        </button>
                    </form>
                </div>
            </div>

            {/* Forgot Password Modal - using your email form approach */}
            {showForgotModal && (
                <div style={styles.modalOverlay} onClick={closeForgotModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Close Button */}
                        <button 
                            style={styles.modalCloseButton} 
                            onClick={closeForgotModal}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            ×
                        </button>

                        <div style={styles.modalContentWrapper}>
                            <h3 style={{...styles.heading, marginBottom: '1.5rem'}}>Reset Password</h3>
                            
                            <div style={styles.inputContainer}>
                                <label style={styles.label}>Email Address<span style={styles.required}>*</span></label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    style={styles.input}
                                    className="login-input"
                                />
                            </div>
                            
                            <div style={styles.status}>{forgotStatus}</div>
                            
                            <button
                                type="button"
                                onClick={sendPasswordResetEmail}
                                style={{...styles.primaryButton, backgroundColor: '#296bd5ff'}}
                                disabled={forgotLoading}
                            >
                                {forgotLoading ? 'Sending...' : 'Send Reset Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;