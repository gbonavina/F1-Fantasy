import React, { useState, useEffect } from "react";
import SideBar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";
import Card from "../components/Cards";
import "../styles/home.css";

export default function Home() {
    const highValue_URL = "https://f1-fantasy-wxq9.onrender.com/driver/most-valuable"
    const lastRace_URL = "https://f1-fantasy-wxq9.onrender.com/2025/results"

    const [drivers, setDrivers] = useState([]);
    const [raceStandings, setRaceStandings] = useState([]);
    const [driversLoading, setDriversLoading] = useState(true);
    const [raceLoading, setRaceLoading] = useState(true);

    useEffect(() => {
        setDriversLoading(true);
        fetch(highValue_URL)
            .then((response) => response.json())
            .then((data) => {
                setDrivers(data);
                setDriversLoading(false);
            })
            .catch((error) => {
                console.error("Erro ao buscar dados:", error);
                setDriversLoading(false);
            });
    }, []);

    useEffect(() => {
        setRaceLoading(true);
        fetch(lastRace_URL)
            .then((response) => response.json())
            .then((data) => {
                // Extract the race results from the nested structure
                const raceResults = data.race || [];
                console.log("Race data received:", raceResults);
                setRaceStandings(raceResults);
                setRaceLoading(false);
            })
            .catch((error) => {
                console.error("Erro ao buscar dados: ", error);
                setRaceLoading(false);
            })
    }, []);

    return (
        <div className="home">
            <SideBar />
            <div className="main-content">
                <SearchBar className="search-bar"/>
                
                <div className="card-container">
                    <Card 
                        title={"PILOTOS MAIS VALORIZADOS"}
                        content={
                            driversLoading ? (
                                <div className="loading-spinner">Carregando...</div>
                            ) : (
                                <ul className="driver-list">
                                    {drivers.map((driver, index) => (
                                        <li key={index} className="driver-item">
                                            <span className="driver-rank">{index + 1}</span>
                                            <div className="driver-info">
                                                <div className="driver-name-value">
                                                    <span className="driver-name">{driver.name}</span>
                                                    {driver.marketValue && <span className="driver-value">${driver.marketValue} M</span>}
                                                </div> 
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )
                        }
                        className="valuable-drivers"
                    />

                    <Card 
                        title={"ÚLTIMA CORRIDA"}
                        content={
                            raceLoading ? (
                                <div className="loading-spinner">Carregando...</div>
                            ) : (
                                <ul className="race-standings">
                                    {raceStandings.map((driver, index) => (
                                        <li key={index} className="driver-item">
                                            <span className="driver-rank">P{index + 1}</span>
                                            <div className="driver-info">
                                                <div className="driver-name-value">
                                                    <span className="driver-name">
                                                        {driver.name}
                                                        {index === 0 && <span className="trophy-emoji" role="img" aria-label="trophy">🥇</span>}
                                                        {index === 1 && <span className="trophy-emoji" role="img" aria-label="trophy">🥈</span>}
                                                        {index === 2 && <span className="trophy-emoji" role="img" aria-label="trophy">🥉</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )
                        }
                        className="race-results"
                    />
                </div>
            </div>
        </div>
    )
}