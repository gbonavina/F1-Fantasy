import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/welcome_page';
// import LoginPage from './pages/login_page';
import Register from './pages/register';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<WelcomePage/>} />
                <Route path="/register" element={<Register/>} />
                {/* <Route path="/login" element={<Login/>} /> */}
            </Routes>
        </BrowserRouter>
    );
}
