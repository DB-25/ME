import streamlit as st

def render():
    # Add Font Awesome CSS
    st.markdown("""
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown("""
        <div class="section-header">
            <div class="header-content">
                <h2>Let's Connect</h2>
                <p class="section-subtitle">Feel free to reach out through any of these platforms</p>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    # Create columns for the contact cards
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
            <div class="contact-card glass-effect">
                <div class="contact-card-content">
                    <div class="contact-icon-wrapper">
                        <i class="fas fa-envelope contact-icon"></i>
                    </div>
                    <div class="contact-info">
                        <h3>Email</h3>
                        <p>Drop me a line anytime!</p>
                    </div>
                    <a href="mailto:dhruvbaradiya@gmail.com" class="contact-link glass-effect">
                        <span>dhruvbaradiya@gmail.com</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
                <div class="card-decoration"></div>
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
            <div class="contact-card glass-effect">
                <div class="contact-card-content">
                    <div class="contact-icon-wrapper">
                        <i class="fab fa-linkedin contact-icon"></i>
                    </div>
                    <div class="contact-info">
                        <h3>LinkedIn</h3>
                        <p>Let's grow our network!</p>
                    </div>
                    <a href="https://linkedin.com/in/dhruvkamaleshkumar" target="_blank" class="contact-link glass-effect">
                        <span>Connect Professionally</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
                <div class="card-decoration"></div>
            </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
            <div class="contact-card glass-effect">
                <div class="contact-card-content">
                    <div class="contact-icon-wrapper">
                        <i class="fab fa-github contact-icon"></i>
                    </div>
                    <div class="contact-info">
                        <h3>GitHub</h3>
                        <p>Check out my code!</p>
                    </div>
                    <a href="https://github.com/DB-25" target="_blank" class="contact-link glass-effect">
                        <span>View My Projects</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
                <div class="card-decoration"></div>
            </div>
        """, unsafe_allow_html=True) 