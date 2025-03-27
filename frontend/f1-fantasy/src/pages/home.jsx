import React from "react";
import SideBar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";
import Card from "../components/Cards";
import "../styles/home.css"

export default function Home() {
    return (
        <div className="home">
            <SideBar />
            <SearchBar className="search-bar"/>

            <div className="card-container">
                <Card 
                    title={"PILOTOS MAIS VALORIZADOS"}
                    content={<p>lando norris
                        <br/>oscar piastri
                        <br/>george russel
                        <br/>lewis Hamilton
                        <br/> max Verstappen
                    </p>}
                    className="valueble-drivers"
                />
            </div>

        </div>
    )
}