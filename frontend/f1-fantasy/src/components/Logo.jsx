import React from "react";
import f1Logo from "../assets/f1_logo.png";

const Logo = ({ className }) => {
  return (
    <img src={f1Logo} alt="Logo" className={className} />
  );
};

export default Logo;