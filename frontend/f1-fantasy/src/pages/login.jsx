import React, {useState} from "react";
import { useActionData, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import BackIcon from '../assets/back.png'
import "../styles/login.css"

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        senha: ''
    });

    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    }
    
    const handleBackClick = () => {
        navigate('/');
    }

    const saveUserData = (data) => {
        const userData = data.user || data;
        
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
    
        document.cookie = `userId=${userData.id}; expires=${expirationDate.toUTCString()}; path=/`;
        document.cookie = `userUsername=${userData.username}; expires=${expirationDate.toUTCString()}; path=/`;
        
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('https://f1-fantasy-wxq9.onrender.com/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data: ', data);

            if (response.ok) {
                saveUserData(data);
                navigate('/home');
            } else {
                setError(data.message || 'Erro ao realizar o registro')
            }
        } catch (err) {
            console.error('Error details: ', err);
            setError('Erro ao conectar com o servidor');
        }
    };


    return (
        <div className="login-page">
            <div className="login-header">
                <Logo className={"login-logo"}/>
                <h1 className="login-title">Fantasy</h1>
            </div>

            <img src={BackIcon} alt='back' className="back-icon" onClick={handleBackClick}/>

            <div className="login-form-container">
                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group-login">
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="USERNAME"
                            required
                        />
                    </div>
                    <div className="form-group-login">
                        <input
                            type="password"
                            name="senha"
                            value={formData.senha}
                            onChange={handleChange}
                            placeholder="SENHA"
                            required
                        />
                    </div>
                    <button type="submit" className="login-button">LOGIN!</button>
                </form>
            </div>
        </div>
    )
}