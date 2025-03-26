import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/welcome_page.css";

export default function WelcomePage() {
    const navigate = useNavigate();

    const handleRegister = () => {
        navigate('/register');
    };

    const handleLogin = () => {
        navigate('/login');
    };

    return (
    <div className="welcome-container">
        <div className="welcome-header">
            <Logo className="welcome-logo" />
            <div className="welcome-text">
                <h1 className="welcome-title">Fantasy</h1>
                <h2 className="welcome-subtitle">
                Escolha. Gerencie. Vença. Conquiste a liderança na F1 Fantasy.
                </h2>
            </div>
        </div>
        <div className="welcome-buttons">
            <button className="welcome-button" onClick={handleRegister}>REGISTRAR-SE!</button>
            <button className="welcome-button" onClick={handleLogin}>LOGIN!</button>
        </div>
    </div>
    );
}