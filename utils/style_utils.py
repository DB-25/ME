import streamlit as st

def load_styles():
    st.markdown("""
    <style>
        :root {
            --primary-color: #2A2A72;
            --secondary-color: #009FFD;
            --text-color: #333;
            --bg-color: #ffffff;
            --badge-bg: linear-gradient(135deg, #2A2A72 0%, #009FFD 100%);
            --gradient-bg: linear-gradient(135deg, rgba(42,42,114,0.05) 0%, rgba(0,159,253,0.05) 100%);
            --box-shadow: 0 8px 32px rgba(0,0,0,0.05);
        }

        /* Dark Mode Variables */
        @media (prefers-color-scheme: dark) {
            :root {
                --text-color: #ffffff;
                --bg-color: #1a1a1a;
                --gradient-bg: linear-gradient(135deg, rgba(42,42,114,0.1) 0%, rgba(0,159,253,0.1) 100%);
                --box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            }
        }

        /* General Styles */
        .stApp {
            max-width: 1200px;
            margin: 0 auto;
            background: var(--gradient-bg);
            color: var(--text-color);
            background-color: var(--bg-color);
        }

        [data-testid="stSidebar"] {
            background: var(--badge-bg);
        }

        /* Hero Section */
        .hero-section {
            padding: 3rem 0;
            text-align: center;
            margin-bottom: 2rem;
            background: var(--gradient-bg);
            border-radius: 20px;
        }

        .hero-content {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 2rem;
        }

        .hero-avatar {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: var(--box-shadow);
            border: 4px solid #fff;
            transition: transform 0.3s ease;
        }

        .hero-avatar:hover {
            transform: scale(1.05);
        }

        .hero-text {
            max-width: 600px;
        }

        .hero-title {
            font-size: 2.8rem;
            margin-bottom: 0.8rem;
            color: var(--text-color);
        }

        .hero-alias {
            font-size: 1.3rem;
            color: var(--text-color);
        }

        .gamer-tag {
            background: linear-gradient(135deg, #009FFD 0%, #6B46C1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: bold;
        }

        .hero-subtitle {
            font-size: 1.4rem;
            color: var(--text-color);
            margin-bottom: 1.5rem;
        }

        .hero-badges {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
        }

        .tech-badge {
            background: var(--badge-bg);
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: var(--box-shadow);
        }

        .tech-badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        /* Chat Section */
        .chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 300px);
            min-height: 500px;
        }

        .chat-messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .chat-input-container {
            display: flex;
            padding: 20px;
            background: white;
            border-top: 1px solid rgba(0,0,0,0.1);
            gap: 10px;
        }

        .chat-input-container input {
            flex-grow: 1;
            padding: 12px 20px;
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 25px;
            outline: none;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        .chat-input-container input:focus {
            border-color: var(--primary-color);
        }

        .send-button {
            background: linear-gradient(135deg, #2A2A72 0%, #009FFD 100%);
            border: none;
            color: white;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease;
        }

        .send-button:hover {
            transform: scale(1.05);
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
            .chat-input-container {
                background: rgba(255,255,255,0.05);
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .chat-input-container input {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: white;
            }

            .chat-input-container input::placeholder {
                color: rgba(255,255,255,0.5);
            }
        }

        /* Achievements Section */
        .achievements-section {
            padding: 1rem;
        }

        .achievement-card {
            background: var(--bg-color);
            border-radius: 15px;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: var(--box-shadow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .achievement-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }

        .achievement-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .achievement-emoji {
            font-size: 1.5rem;
        }

        .achievement-institution {
            color: var(--text-color);
            opacity: 0.7;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        .achievement-links {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 0.5rem;
        }

        .achievement-link {
            background: var(--badge-bg);
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            color: white;
            text-decoration: none;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: var(--box-shadow);
        }

        .achievement-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        /* Streamlit Components */
        .stButton button {
            width: 100%;
            border-radius: 25px !important;
            background: var(--badge-bg) !important;
            color: white !important;
            border: none !important;
            padding: 0.5rem 1rem !important;
            font-size: 1rem !important;
            transition: transform 0.3s ease, box-shadow 0.3s ease !important;
        }

        .stButton button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important;
        }

        /* Hide Streamlit Components */
        #MainMenu, footer, header {
            visibility: hidden;
        }

        .main-content {
            display: flex;
            gap: 2rem;
            margin-top: 2rem;
        }

        [data-testid="column"] {
            background: transparent !important;
        }

        /* Adjust achievement cards for narrower column */
        .achievement-card {
            margin: 0 0 1rem 0;
            height: fit-content;
        }

        /* Ensure chat container fills the column */
        .chat-container {
            height: calc(100vh - 300px);  /* Adjust based on your needs */
            min-height: 500px;
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
            :root {
                --text-color: #fff;
            }
            
            .hero-section {
                background: linear-gradient(135deg, rgba(42,42,114,0.15) 0%, rgba(0,159,253,0.15) 100%);
            }
        }

        /* Chat Header Styles */
        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: var(--badge-bg);
            color: white;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
        }

        .chat-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .chat-avatar {
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .chat-info h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
        }

        .chat-subtitle {
            margin: 0;
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .clear-chat-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .clear-chat-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.05);
        }

        .clear-chat-btn i {
            font-size: 16px;
        }

        /* Chat Messages */
        .message {
            display: flex;
            margin-bottom: 1rem;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message-bubble {
            padding: 12px 16px;
            border-radius: 15px;
            max-width: 70%;
            word-wrap: break-word;
        }

        .user-message {
            justify-content: flex-end;
        }

        .user-message .message-bubble {
            background: var(--badge-bg);
            color: white;
            border-bottom-right-radius: 5px;
        }

        .bot-message .message-bubble {
            background: rgba(0,0,0,0.05);
            color: var(--text-color);
            border-bottom-left-radius: 5px;
        }

        .bot-message .message-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: var(--badge-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            color: white;
        }

        /* Chat Input */
        .chat-input-container {
            padding: 1rem;
            background: var(--bg-color);
            border-top: 1px solid rgba(0,0,0,0.1);
            display: flex;
            gap: 10px;
            position: sticky;
            bottom: 0;
        }

        .chat-input-container input {
            flex-grow: 1;
            padding: 12px 20px;
            border: 2px solid rgba(0,0,0,0.1);
            border-radius: 25px;
            outline: none;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: var(--bg-color);
            color: var(--text-color);
        }

        .chat-input-container input:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(0,159,253,0.1);
        }

        .send-button {
            background: var(--badge-bg);
            border: none;
            color: white;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .send-button:hover {
            transform: scale(1.05);
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
            .chat-input-container {
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .chat-input-container input {
                background: rgba(255,255,255,0.05);
                border-color: rgba(255,255,255,0.1);
            }

            .chat-input-container input::placeholder {
                color: rgba(255,255,255,0.5);
            }

            .bot-message .message-bubble {
                background: rgba(255,255,255,0.05);
            }
        }

        /* Modern Chat UI Styles */
        .chat-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            height: calc(100vh - 300px);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Glass effect */
        .glass-effect {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Header Styles */
        .chat-header {
            padding: 20px;
            background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chat-title {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .chat-avatar {
            width: 45px;
            height: 45px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }

        .chat-info h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
        }

        .chat-subtitle {
            margin: 5px 0 0;
            font-size: 0.9rem;
            opacity: 0.8;
        }

        /* Messages Container */
        .chat-messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 20px;
            gap: 20px;
            display: flex;
            flex-direction: column;
        }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        /* Message Styles */
        .message {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: fadeIn 0.3s ease;
        }

        .message-bubble {
            padding: 12px 16px;
            border-radius: 15px;
            max-width: 70%;
            position: relative;
        }

        .message-time {
            font-size: 0.75rem;
            opacity: 0.7;
            margin-top: 5px;
            display: block;
        }

        .user-message {
            justify-content: flex-end;
        }

        .user-message .message-bubble {
            background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
            color: white;
            border-bottom-right-radius: 5px;
        }

        .bot-message .message-bubble {
            background: rgba(255, 255, 255, 0.05);
            border-bottom-left-radius: 5px;
        }

        /* Input Container */
        .chat-input-container {
            padding: 20px;
            display: flex;
            gap: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glass-input {
            flex-grow: 1;
            padding: 12px 20px;
            border-radius: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-color);
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        .glass-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(0, 159, 253, 0.1);
        }

        .send-button {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .send-button:hover {
            transform: scale(1.05);
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }

        /* Section Cards */
        .section-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            padding: 24px;
            margin-bottom: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        .section-header h3 {
            font-size: 1.5rem;
            margin: 0;
            color: var(--text-color);
        }

        .section-header i {
            font-size: 1.5rem;
            background: var(--badge-bg);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Projects Grid */
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        /* Project Cards */
        .project-card {
            padding: 20px;
            border-radius: 15px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .project-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .project-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 15px;
        }

        .project-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: var(--badge-bg);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }

        .project-header h4 {
            margin: 0;
            font-size: 1.2rem;
            color: var(--text-color);
        }

        .project-description {
            color: var(--text-color);
            opacity: 0.8;
            margin-bottom: 15px;
            line-height: 1.5;
        }

        .tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 15px;
        }

        .tech-badge {
            padding: 5px 12px;
            border-radius: 15px;
            background: var(--badge-bg);
            color: white;
            font-size: 0.8rem;
            transition: transform 0.3s ease;
        }

        .tech-badge:hover {
            transform: translateY(-2px);
        }

        .project-links {
            display: flex;
            gap: 10px;
        }

        .project-link {
            padding: 8px 16px;
            border-radius: 12px;
            color: var(--text-color);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }

        .project-link:hover {
            transform: translateY(-2px);
            background: var(--badge-bg);
            color: white;
        }

        /* Contact Section Styles */
        [data-testid="column"] {
            background: transparent !important;
            padding: 0 10px;
        }

        .section-header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 0 20px;
        }

        .header-content h2 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #009FFD 0%, #6B46C1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
            font-weight: bold;
            text-shadow: 0px 0px 20px rgba(107, 70, 193, 0.2);
        }

        .section-subtitle {
            color: var(--text-color);
            opacity: 0.8;
            font-size: 1.1rem;
        }

        .contact-card {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            height: 100%;
        }

        .contact-card-content {
            padding: 2rem;
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            height: 100%;
        }

        .contact-icon-wrapper {
            width: 50px;
            height: 50px;
            border-radius: 15px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .contact-icon {
            font-size: 1.5rem;
            color: white;
        }

        .contact-info h3 {
            font-size: 1.3rem;
            margin: 0 0 0.5rem 0;
            color: var(--text-color);
        }

        .contact-info p {
            color: var(--text-color);
            opacity: 0.7;
            margin: 0;
            font-size: 0.95rem;
        }

        .contact-link {
            margin-top: auto;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--text-color);
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.3s ease;
        }

        .contact-link:hover {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border-color: transparent;
        }

        .contact-link span {
            font-size: 0.9rem;
        }

        .contact-link i {
            transition: transform 0.3s ease;
        }

        .contact-link:hover i {
            transform: translateX(5px);
        }

        .card-decoration {
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200px;
            height: 200px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 50%;
            opacity: 0.05;
            transition: all 0.3s ease;
        }

        .contact-card:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .contact-card:hover .card-decoration {
            transform: scale(1.2);
            opacity: 0.08;
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
            .contact-card {
                background: rgba(0, 0, 0, 0.2);
            }
            
            .contact-link {
                background: rgba(0, 0, 0, 0.2);
            }
        }

        /* Dark Mode Adjustments */
        @media (prefers-color-scheme: dark) {
            .header-content h2 {
                background: linear-gradient(135deg, #00D4FF 0%, #9D6FFF 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0px 0px 30px rgba(157, 111, 255, 0.3);
            }

            .section-subtitle {
                color: rgba(255, 255, 255, 0.9);
            }
        }

    </style>

    """, unsafe_allow_html=True)
