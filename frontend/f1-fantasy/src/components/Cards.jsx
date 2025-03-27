import React from "react";
import "../styles/cards.css"

const Card = ({
    title, content, icon, className = "", footer
}) => {
    return (
        <div className={`card ${className}`}>
            <div className="card-header">
                {icon && <div className="card-icon">{icon}</div>}
                {title && <h3 className="card-title">{title}</h3>}
            </div>
            <div className="card-content">
                {content}
            </div>
            {footer && (
                <div className="card-footer">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default Card;