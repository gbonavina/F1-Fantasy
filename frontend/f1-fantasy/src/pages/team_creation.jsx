import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";
import { getUserData } from '../utils/getUserID';
import SideBar from '../components/Sidebar'
import BackIcon from '../assets/back.png'
import '../styles/team_creation.css'

export default function TeamCreation() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: ''
    });

    const [error, setError] = useState('');
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const user = await getUserData();
            setUserData(user);
        };
        fetchUserData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!userData || !userData.id) {
                setError('Dados do usuário não disponíveis');
                return;
            }
            
            // Incluir o ID do usuário no objeto enviado
            const requestData = {
                nome: formData.nome,
                usuario_id: userData.id
            };
            
            console.log('Sending data:', requestData);
            
            const response = await fetch('https://f1-fantasy-wxq9.onrender.com/team/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                navigate('/home');
            } else {
                setError(data.message || 'Erro ao criar equipe.');
            }
        } catch (err) {
            console.error('Error details:', err);
            setError('Erro ao conectar com o servidor');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    }

    const handleBackClick = () => {
        navigate('/home');
    }

    return (
        <div className="page-container">
            <SideBar />
            <div className='team-creation'>
                <div className='text-title'>
                    <h1>DÊ UM NOME A<br /> SUA EQUIPE</h1>
                </div>
                <img src={BackIcon} alt='back' className='back-icon-team' onClick={handleBackClick}/>
                <div className='form'>
                    <form onSubmit={handleSubmit}>
                        <div className='formGroup'>
                            <input 
                                type="text"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                placeholder="NOME DA EQUIPE"
                                required
                                />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" className="submit-button">CRIAR EQUIPE!</button>
                    </form>
                </div>
            </div>
        </div>
    );
}