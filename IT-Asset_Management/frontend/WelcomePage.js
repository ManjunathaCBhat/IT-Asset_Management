// src/WelcomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
    // --- Responsive State & Logic ---
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const [buttonHovered, setButtonHovered] = useState(false); // State for button hover effect

    useEffect(() => {
        // Set body styles to prevent scrolling
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            // Reset body styles
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    const isMobile = windowWidth <= 768;
    const isTablet = windowWidth <= 992;
    const isLargeDesktop = windowWidth <= 1200;

    // --- Image Paths (ensure these are correct relative to your public folder) ---
    const logoSrc = `${process.env.PUBLIC_URL}/C_Lab Logo.png`;


    // --- Inline Style Objects ---

    const globalBodyStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        fontFamily: "'Poly', sans-serif",
        backgroundColor: '#ffffff',
        color: 'rgba(0, 0, 0, 0.78)',
        boxSizing: 'border-box',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    const containerStyle = {
        maxWidth: '1440px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '15px',
        paddingRight: '15px',
        ...(isTablet && { paddingLeft: '10px', paddingRight: '10px' }),
        ...(isMobile && { paddingLeft: '5px', paddingRight: '5px' }),
    };

    const linkBaseStyle = {
        textDecoration: 'none',
        color: 'inherit',
    };

    const ulBaseStyle = {
        margin: 0,
        padding: 0,
        listStyle: 'none',
    };

    // Header Styles
    const siteHeaderStyle = {
        backgroundColor: '#ffffff',
        paddingTop: isMobile ? '6px' : '8px',
        paddingBottom: isMobile ? '6px' : '8px',
        paddingLeft: isLargeDesktop ? '8px' : '15px',
        paddingRight: isLargeDesktop ? '10px' : '15px',
        flexShrink: 0,
        minHeight: 'auto',
    };

    const headerContainerStyle = {
        ...containerStyle,
        display: 'flex',
        flexDirection: 'column',
    };

    const headerTopStyle = {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        marginBottom: '8px',
        marginTop: isMobile ? '5px' : '10px',
        ...(isMobile && { justifyContent: 'center', marginBottom: '6px', flexWrap: 'wrap' }),
    };

    const locationNavUlStyle = {
        ...ulBaseStyle,
        display: 'flex',
        alignItems: 'center',
        ...(isMobile && { flexWrap: 'wrap', justifyContent: 'center' }),
    };

    const locationNavLiStyle = {
        position: 'relative',
        padding: isMobile ? '0 6px' : '0 8px',
    };

    const separatorStyle = {
        borderRight: '1px solid #ccc',
        height: isMobile ? '12px' : '14px',
        margin: isMobile ? '0 6px' : '0 8px',
    };

    const locationNavAStyle = {
        fontFamily: "'Crimson Text', serif",
        fontSize: isMobile ? '12px' : '13px',
        fontWeight: 400,
        color: '#000000',
        letterSpacing: '0.6px',
        whiteSpace: 'nowrap',
        ...linkBaseStyle,
    };

    const callIconStyle = {
        marginRight: isMobile ? '3px' : '5px',
        color: '#0f3374',
        fontSize: isMobile ? '11px' : '13px',
    };

    const headerMainStyle = {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        gap: '20px',
        ...(isMobile && { flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }),
    };

    const logoBaseStyle = {
        width: isMobile ? '100px' : '150px',
        height: 'auto',
        display: 'block',
        filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.2))',
    };

    // Hero Section Styles
    const heroSectionStyle = {
        position: 'relative',
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '20px 0' : '30px 0',
        overflow: 'hidden',
        textAlign: 'center',
        minHeight: 0, // Allow flex shrinking
    };


    const heroContentStyle = {
        maxWidth: isMobile ? '90%' : '800px',
        padding: isMobile ? '10px' : '20px',
        boxSizing: 'border-box',
        zIndex: 1,
    };

    const heroTitleStyle = {
        fontFamily: "'Crimson Text', serif",
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: 700,
        color: '#0f3374',
        letterSpacing: '1.3px',
        marginTop: 0,
        marginBottom: isMobile ? '10px' : '12px',
    };

    const heroTextStyle = {
        fontFamily: "'Poly', sans-serif",
        fontSize: isMobile ? '14px' : '18px',
        color: 'rgba(0, 0, 0, 0.78)',
        lineHeight: 1.4,
        letterSpacing: '1.3px',
        marginBottom: isMobile ? '10px' : '15px',
    };

    const heroButtonStyle = {
        display: 'inline-block',
        background: buttonHovered ? '#b01f1f' : '#dc2626', // Change color on hover
        color: '#ffffff',
        fontFamily: "'Rozha One', serif",
        fontSize: isMobile ? '18px' : '24px',
        fontWeight: 400,
        padding: isMobile ? '8px 20px' : '10px 30px',
        borderRadius: '20px',
        letterSpacing: '0.2px',
        textAlign: 'center',
        transition: 'background 0.3s ease, transform 0.3s ease', // Smooth transition
        transform: buttonHovered ? 'scale(1.05)' : 'scale(1)', // Slight scale on hover
        border: 'none',
        cursor: 'pointer',
        ...linkBaseStyle,
    };

    // Footer Styles
    const siteFooterStyle = {
        backgroundColor: '#36548b',
        color: '#ffffff',
        padding: isMobile ? '5px 0' : '8px 0',
        flexShrink: 0,
        minHeight: 'auto',
    };

    const footerContainerStyle = {
        ...containerStyle,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        flexDirection: 'column',
        textAlign: 'center',
    };

    const footerLogoImgStyle = {
        width: isMobile ? '80px' : '100px',
        height: 'auto',
        marginBottom: '3px',
        filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.2))',
    };

    const copyrightTextStyle = {
        fontFamily: "'Poly', sans-serif",
        fontSize: isMobile ? '8px' : '10px',
        letterSpacing: '0.8px',
        color: '#ffffff',
        margin: 0,
    };

    return (
        <div style={globalBodyStyle}>
            {/* Header */}
            <header id="header" style={siteHeaderStyle}>
                <div style={headerContainerStyle}>
                    {/* Top-right navigation bar */}
                    <div style={headerTopStyle}>
                        <nav>
                            <ul style={locationNavUlStyle}>
                                {/* Call Us */}
                                <li style={locationNavLiStyle}>
                                    <a href="tel:877-431-0767" style={locationNavAStyle}>
                                        <span style={callIconStyle}>📞</span> CALL US: (877)431-0767
                                    </a>
                                </li>
                                {/* Separator */}
                                <div style={separatorStyle}></div>

                                {/* INDIA */}
                                <li style={locationNavLiStyle}>
                                    <a href="https://www.cirruslabs.io/india" target="_blank" rel="noopener noreferrer" style={locationNavAStyle}>INDIA</a>
                                </li>
                                {/* Separator */}
                                <div style={separatorStyle}></div>

                                {/* CANADA */}
                                <li style={locationNavLiStyle}>
                                    <a href="https://www.cirruslabs.io/north" target="_blank" rel="noopener noreferrer" style={locationNavAStyle}>CANADA</a>
                                </li>
                                {/* Separator */}
                                <div style={separatorStyle}></div>

                                {/* MIDDLE EAST */}
                                <li style={locationNavLiStyle}>
                                    <a href="https://www.cirruslabs.io/middleeast" target="_blank" rel="noopener noreferrer" style={locationNavAStyle}>MIDDLE EAST</a>
                                </li>
                                {/* Separator */}
                                <div style={separatorStyle}></div>

                                {/* USA (no separator after last item) */}
                                <li style={locationNavLiStyle}>
                                    <a href="https://www.cirruslabs.io/usa" target="_blank" rel="noopener noreferrer" style={locationNavAStyle}>USA</a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                    <div style={headerMainStyle}>
                        <Link to="/" style={linkBaseStyle}>
                            <img src={logoSrc} alt="Cirrus Labs Logo" style={logoBaseStyle} />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section id="hero" style={heroSectionStyle}>
                <div style={heroContentStyle}>
                    <h1 style={heroTitleStyle}>Welcome To AssetTracker</h1>
                    <p style={heroTextStyle}>
                        This internal IT Asset Management system is exclusively designed for our company's IT team.
                        <br/><br/>
                        It provides comprehensive hardware tracking, auditing, and lifecycle management for all IT hardware resources.
                        Optimize hardware resources, enhance security, and maintain audit readiness with our powerful internal ITAM solution.
                    </p>
                    <Link
                        to="/login"
                        style={heroButtonStyle}
                        onMouseOver={() => setButtonHovered(true)}
                        onMouseLeave={() => setButtonHovered(false)}
                    >
                        Get Started
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer id="footer" style={siteFooterStyle}>
                <div style={footerContainerStyle}>
                    <div> {/* footer-logo container */}
                        <Link to="/" style={linkBaseStyle}>
                            <img src={logoSrc} alt="Cirrus Labs Logo" style={footerLogoImgStyle} />
                        </Link>
                    </div>
                    <p style={copyrightTextStyle}>
                        © {new Date().getFullYear()} Cirrus Labs. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;
