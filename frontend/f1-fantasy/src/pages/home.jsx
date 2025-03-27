import React, { useState, useEffect } from "react";
import SideBar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";
import Card from "../components/Cards";
import "../styles/home.css"

export default function Home() {
    const URL = "https://f1-fantasy-wxq9.onrender.com/driver/most-valuable"

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(URL)
            .then((response) => response.json())
            .then((data) => {
                setDrivers(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Erro ao buscar dados:", error);
                setLoading(false);
            });
    }, []);

    return (
        <div className="home">
            <SideBar />
            <SearchBar className="search-bar"/>

            <div className="card-container">
                <Card 
                    title={"PILOTOS MAIS VALORIZADOS"}
                    content={
                        loading ? (
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
            </div>
        </div>
    )
}