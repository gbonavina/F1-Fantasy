import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/welcome_page';
import Login from './pages/login';
import Register from './pages/register';
import Home from './pages/home';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<WelcomePage/>} />
                <Route path="/register" element={<Register/>} />
                <Route path="/login" element={<Login/>} />
                <Route path="/home" element={<Home/>}/>
            </Routes>
        </BrowserRouter>
    );
}
