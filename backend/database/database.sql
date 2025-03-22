USE f1_fantasy;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    saldo DECIMAL(10 , 2 ) NOT NULL DEFAULT 150.00
);

CREATE TABLE equipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  usuario_id INT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE (usuario_id)  
);

CREATE TABLE pilotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    equipe_id INT NOT NULL,
    pontos INT NOT NULL,
    valor DECIMAL(10 , 2 ) NOT NULL,
    FOREIGN KEY (equipe_id)
        REFERENCES equipes (id)
);

CREATE TABLE pilotos_equipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    piloto_id INT NOT NULL,
    equipe_id INT NOT NULL,
    FOREIGN KEY (piloto_id)
        REFERENCES pilotos (id),
    FOREIGN KEY (equipe_id)
        REFERENCES equipes (id)
);

CREATE TABLE IF NOT EXISTS corridas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  driver_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  team VARCHAR(100) NOT NULL,
  grid_start INT NOT NULL,
  grid_finish INT NOT NULL,
  positions_gained INT NOT NULL,
  race_points FLOAT DEFAULT 0,
  fantasy_points FLOAT DEFAULT 0,
  status VARCHAR(50),
  fastest_lap BOOLEAN DEFAULT FALSE,
  race_type ENUM('race', 'sprint') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_driver_year (driver_id, year),
  INDEX idx_track_year (track, year),
  INDEX idx_race_type (race_type)
);