import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUserData } from "../utils/getUserID";
import UserIcon from '../assets/user-icon.png';
import Logo from '../components/Logo';
import '../styles/sidebar.css';

export default function SideBar() {
    const [username, setUsername] = useState("Usuário");
    const [hasTeam, setHasTeam] = useState(false);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = getUserData();
                console.log("User data from getUserData:", user);

                if (user && user.username) {
                    setUsername(user.username);
                    console.log("User ID for fetch:", user.id);
                    
                    // Verificar se o usuário tem uma equipe
                    try {
                        const response = await fetch(`https://f1-fantasy-wxq9.onrender.com/team/${user.id}`);
                        
                        if (response.ok) {
                            const teamData = await response.json();
                            
                            if (Array.isArray(teamData)) {
                                if (teamData.length > 0) {                                 
                                    if (teamData[0]?.saldo !== undefined) {
                                        const parsedBalance = parseFloat(teamData[0].saldo);
                                        setBalance(parsedBalance || 0);
                                    } else {
                                        setBalance(0);
                                    }
                                    setHasTeam(true);
                                } else {
                                    setHasTeam(false);
                                    setBalance(0);
                                }
                            } else if (teamData && typeof teamData === 'object') {                              
                                if (teamData.saldo !== undefined) {
                                    const parsedBalance = parseFloat(teamData.saldo);
                                    setBalance(parsedBalance || 0);
                                } else {
                                    setBalance(0);
                                }
                                setHasTeam(true);
                            } else {
                                setHasTeam(false);
                                setBalance(0);
                            }
                        } else {
                            setHasTeam(false);
                            setBalance(0);
                        }
                    } catch (error) {
                        console.error("Erro ao buscar dados da equipe:", error);
                        setHasTeam(false);
                        setBalance(0);
                    }
                } else {
                    console.log("No user data or username available");
                }
            } catch (error) {
                console.error("Error in fetchUserData:", error);
            }
        };

        fetchUserData();
    }, []);


    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <Link to="/" className="logo-link">
                    <Logo className="sidebar-logo"/>
                    <h1 className="sidebar-title">Fantasy</h1>
                </Link>
            </div>
            
            <div className="sidebar-nav">
                <Link to="/my-team" className="item"><h2>MINHA EQUIPE</h2></Link>
                <Link to="/driver-market" className="item"><h2>MERCADO DE PILOTOS</h2></Link>
                <Link to="/last-race" className="item"><h2>ÚLTIMA CORRIDA</h2></Link>
                
                {hasTeam ? (
                    <div className="balance-info">
                        <h3>SALDO:</h3>
                        <p>${balance.toFixed(2)} M</p>
                    </div>
                ) : (
                    <Link to="/create-team" className="create-team-button">
                        <button>CRIAR MINHA EQUIPE</button>
                    </Link>
                )}
            </div>
            
            <Link to="/user" className="user">
                <img src={UserIcon} alt="icon" className="user-icon"/>
                <h2>{username}</h2>
            </Link>
        </div>
    );
    
}