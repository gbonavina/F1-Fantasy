import React, {useState} from "react";
import { useActionData, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import BackIcon from '../assets/back.png'
import "../styles/register.css"

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log('Sending data:', formData);
            const response = await fetch('https://f1-fantasy-wxq9.onrender.com/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.status === 201) {
                navigate('/login');
            } else {
                setError(data.message || 'Erro ao realizar o registro');
            }
        } catch (err) {
            console.error('Error details:', err);
            setError('Erro ao conectar com o servidor');
        }
    };

    const handleBackClick = () => {
        navigate('/');
    }


    return (
        <div className="register-page">
            <div className="register-header">
                <Logo className="register-logo" />
                <h1 className="register-title">Fantasy</h1>
            </div>

            <img src={BackIcon} alt="back" className="back-icon" onClick={handleBackClick}/>

            <div className="register-form-container">
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input 
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            placeholder="NOME"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <input 
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="USERNAME"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            name="senha"
                            value={formData.senha}
                            onChange={handleChange}
                            placeholder="SENHA"
                            required
                        />
                    </div>
                    <button type="submit" className="register-button">REGISTRAR-SE!</button>
                </form>
            </div>
        </div>
    )



}