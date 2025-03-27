import React from "react";
import SideBar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";

export default function Home() {
    return (
        <div className="home">
            <SideBar />
            <SearchBar className="search-bar"/>
        </div>
    )
}