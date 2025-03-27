import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../assets/search.png"; 
import "../styles/search-bar.css"

export default function SearchBar() {
    const [inputValue, setInputValue] = useState("");
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (inputValue.trim() !== "") {
            navigate(`/user/${inputValue.trim()}`);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    };


    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder="BUSCAR USUÁRIO"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress} 
            />

            <button onClick={handleSearch}>
                <img src={searchIcon} alt="Buscar" className="glass"/>
            </button>
        </div>
    )
}