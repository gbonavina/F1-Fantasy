const { getRace, getCompletedRaces, getNextRace } = require('./modules/data_modules');
const { createTeam, getUserTeams, updateLastRace, updateDriverPoints, buyDriver, sellDriver, buyTeamStructure, upgradeTeamStructure, getHighValueDrivers } = require('./modules/fantasy_modules');
const fastify = require('fastify');
const pool = require('./database/database');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
require('dotenv').config();

const app = fastify();
const port = 5000;

const fastifyCors = require('@fastify/cors');
app.register(fastifyCors, { 
  origin: ['http://localhost:3000', 'http://f1-fantasy.vercel.app'],  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: true
});

console.log('Configurando agendamento de atualizações de corridas...');

// Verificar atualizações de corridas todos os dias às 12:00
cron.schedule('0 12 * * *', async () => {
  console.log('Executando verificação agendada de atualizações de corrida...');
  
  try {
    const nextRace = await getNextRace();
    const currentYear = new Date().getFullYear();
    const completedRaces = await getCompletedRaces(currentYear);
    
    const [lastUpdate] = await pool.execute(
      'SELECT value FROM system_settings WHERE name = "last_race_update"'
    );
    
    const lastUpdateTime = lastUpdate.length > 0 
      ? new Date(lastUpdate[0].value) 
      : new Date(0); // Se nunca foi atualizado, usar data muito antiga
    
    const now = new Date();
    
    // Se a última atualização foi há mais de 20 horas e temos uma corrida recente
    if ((now - lastUpdateTime) / (1000 * 60 * 60) > 20 && 
        Object.keys(completedRaces).length > 0) {
      
      console.log('Corrida recente detectada. Atualizando dados...');
      
      await updateLastRace();
      console.log('Dados da corrida atualizados');
      
      await updateDriverPoints();
      console.log('Pontos dos pilotos atualizados');
      
      if (nextRace) {
        console.log(`Próxima corrida: ${nextRace.name} em ${nextRace.date}`);
      } else {
        console.log('Não há informações sobre a próxima corrida');
      }
    }
  } catch (error) {
    console.error('Erro durante a atualização automática de corridas:', error);
  }
});

const start = async () => {
  try {
    await app.listen({ port: port, host: '0.0.0.0' });
    console.log(`API F1 Fantasy rodando em http://localhost:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

// Rota de teste para verificar a conexão com o banco de dados
app.get('/test-db', async (req, reply) => {
  try {
    const [result] = await pool.execute('SELECT 1 + 1 as result');
    return { success: true, result: result[0].result };
  } catch (error) {
    console.error('Database connection error:', error);
    return { success: false, error: error.message };
  }
});

app.get("/:year/results/:track?", async (req, reply) => {
  const track = req.params.track;
  const year = req.params.year;

  try {
    let race_results;

    if (!track || track === 'latest') {    
      const completedRaces = await getCompletedRaces(year);
      
      if (Object.keys(completedRaces).length === 0) {
        return reply.status(404).send({ error: 'No completed races found for this year' });
      }
      
      const latestRaceKey = Object.keys(completedRaces).pop();
      
      race_results = completedRaces[latestRaceKey];
    } else {

      race_results = await getRace(track, year);
    }

    reply.send(race_results);
  } catch (error) {
    console.error('Error fetching race data:', error);
    reply.status(500).send({ error: 'Error fetching race data' });
  }
});

app.post('/register', async (req, reply) => {
  const { nome, username, senha } = req.body;

  if (!username || !senha || !nome) {
    return reply.status(400).send({ error: 'Invalid request' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (rows.length > 0) {
      return reply.status(400).send({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const [result] = await pool.execute('INSERT INTO usuarios (nome, username, senha) VALUES (?, ?, ?)', [nome, username, hashedPassword]);
    reply.status(201).send({ message: 'User registered successfully' });
  
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error registering user' });
  }
});

app.post('/login', async (req, reply) => {
  const { username, senha } = req.body;

  if (!username || !senha) {
    return reply.status(400).send({ error: 'Username and password required' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (rows.length === 0) {
      return reply.status(401).send({ error: 'User not registered' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      return reply.status(401).send({ error: 'Invalid password' });
    }

    // Retornar informações do usuário após login bem-sucedido
    reply.status(200).send({ 
      message: 'User logged in successfully',
      user: {
        id: user.id,
        nome: user.nome,
        username: user.username
      }
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error logging in'});
  }
});

app.post('/team/create', async (req, reply) => {
  const { nome, usuario_id } = req.body;

  if (!nome || !usuario_id) {
    return reply.status(400).send({ error: 'Inform user and team' });
  }

  try {
    const response = await createTeam(nome, usuario_id);
    if (response.error) {
      return reply.status(400).send(response);
    }

    reply.status(201).send(response);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error creating team' });
  }
});

app.get('/team/:user_id', async (req, reply) => {
  const user_id = req.params.user_id;

  try {
    const teams = await getUserTeams(user_id);
    reply.send(teams);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error fetching user teams' });
  }
});

app.post('/drivers/update-points', async (req, reply) => {
  try {
    const response = await updateDriverPoints();
    reply.send(response);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error updating driver points' });
  }
});

app.post('/team/buy/:team/:driver', async (req, reply) => {
  const driver = req.params.driver;
  const team_id = req.params.team;

  try {
    const response = await buyDriver(driver, team_id);
    if (response.error) {
      return reply.status(400).send(response);
    }

    reply.send(response);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error buying driver' });
  }
});

app.post('/team/sell/:team/:driver', async (req, reply) => {
  const driver = req.params.driver;
  const team_id = req.params.team;

  try {
    const response = await sellDriver(driver, team_id);
    if (response.error) {
      return reply.status(400).send(response);
    }

    reply.send(response);
  } catch(error) {
    console.error(error);
    reply.status(500).send({ error: 'Error selling driver' });
  }
});

app.get('/drivers', async (req, reply) => {
  try {
    const [rows] = await pool.execute('SELECT id, nome, equipe, pontos, fantasy_points, valor FROM pilotos');
    reply.send(rows);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error fetching drivers' });
  }
});

app.post('/team/structures/buy/:team/:structure', async (req, reply) => {
  const team_id = req.params.team;
  const structure_id = req.params.structure;

  try {
    // Inverta a ordem dos parâmetros para corresponder à implementação da função
    const response = await buyTeamStructure(structure_id, team_id);
    if (response.error) {
      return reply.status(400).send(response);
    }

    reply.send(response);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error buying team structure' });
  }
});

app.post('/team/structures/upgrade/:team/:structure_id', async (req, reply) => {
  const team_id = req.params.team;
  const structure_id = req.params.structure_id;

  try {
    const response = await upgradeTeamStructure(structure_id, team_id);
    if (response.error) {
      return reply.status(400).send(response);
    }

    reply.send(response);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error upgrading team structure' });
  }
});

app.get('/team/details/:team_id', async (req, reply) => {
  const team_id = req.params.team_id;

  try {
    // Obter informações da equipe
    const [team] = await pool.execute(
      'SELECT * FROM equipes WHERE id = ?',
      [team_id]
    );

    if (team.length === 0) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    // Obter pilotos da equipe com pontos ajustados
    const [drivers] = await pool.execute(
      `SELECT pe.*, p.nome, p.equipe, p.fantasy_points as base_points 
       FROM pilotos_equipes pe
       JOIN pilotos p ON pe.piloto_id = p.id
       WHERE pe.equipe_id = ?`,
      [team_id]
    );

    // Obter estruturas da equipe
    const [structures] = await pool.execute(
      `SELECT tso.*, ts.name, ts.description, ts.multiplier_type, ts.multiplier_value 
       FROM team_structures_owned tso
       JOIN team_structures ts ON tso.structure_id = ts.id
       WHERE tso.equipe_id = ?`,
      [team_id]
    );

    // Obter usuário proprietário
    const [owner] = await pool.execute(
      `SELECT u.id, u.nome, u.username, u.saldo 
       FROM usuarios u
       JOIN equipes e ON u.id = e.usuario_id
       WHERE e.id = ?`,
      [team_id]
    );

    // Sempre somar os fantasy_points_adjusted dos pilotos (caso só tenha 1, soma com 0)
    const totalAdjusted = parseFloat(
      drivers.reduce((sum, d) => sum + (parseFloat(d.fantasy_points_adjusted) || 0), 0)
      .toFixed(1)
    );

    reply.send({
      team: team[0],
      fantasy_points_adjusted: totalAdjusted,
      drivers: drivers,
      structures: structures,
      owner: owner[0]
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error fetching team details' });
  }
});

app.get('/structures', async (req, reply) => {
  try {
    const [structures] = await pool.execute('SELECT * FROM team_structures');
    reply.send(structures);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error fetching available structures' });
  }
});

app.post('/team/recalculate-points/:team_id', async (req, reply) => {
  const team_id = req.params.team_id;

  try {
    // Obter pilotos da equipe
    const [teamDrivers] = await pool.execute(
      'SELECT piloto_id FROM pilotos_equipes WHERE equipe_id = ?',
      [team_id]
    );

    if (teamDrivers.length === 0) {
      return reply.status(400).send({ error: 'Team has no drivers' });
    }

    // Para cada piloto, recalcular os pontos ajustados
    for (const entry of teamDrivers) {
      const driver_id = entry.piloto_id;
      
      // Obter piloto 
      const [driver] = await pool.execute(
        'SELECT nome, fantasy_points FROM pilotos WHERE id = ?',
        [driver_id]
      );
      
      if (driver.length === 0) continue;
      
      const basePoints = parseFloat(driver[0].fantasy_points) || 0;
      
      // Buscar estruturas da equipe
      const [teamStructures] = await pool.execute(
        `SELECT ts.multiplier_type, ts.multiplier_value, tso.current_level
         FROM team_structures_owned tso
         JOIN team_structures ts ON tso.structure_id = ts.id
         WHERE tso.equipe_id = ?`,
        [team_id]
      );
      
      let adjustedPoints = basePoints;
      
      // Aplicar multiplicadores
      for (const structure of teamStructures) {
        const multiplier = parseFloat(structure.multiplier_value) * 
                         (1 + (structure.current_level - 1) * 0.2);
        
        // Simplificado para exemplo - na prática, você usaria a lógica completa
        if (structure.multiplier_type === 'all_points') {
          adjustedPoints = basePoints * multiplier;
        }
      }
      
      // Atualizar na tabela
      await pool.execute(
        'UPDATE pilotos_equipes SET fantasy_points_adjusted = ? WHERE piloto_id = ? AND equipe_id = ?',
        [adjustedPoints, driver_id, team_id]
      );
    }
    
    reply.send({ 
      message: 'Points recalculated successfully',
      team_id: team_id
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Error recalculating team points' });
  }
});

app.post('/admin/force-update', async (req, reply) => {
  try {
    // Atualizar dados da corrida
    const raceResponse = await updateLastRace();
    
    // Atualizar pontos dos pilotos
    const pointsResponse = await updateDriverPoints();
    
    // Atualizar timestamp da última atualização
    const now = new Date();
        
    reply.send({
      message: 'Atualização forçada concluída com sucesso',
      raceUpdate: raceResponse,
      pointsUpdate: pointsResponse,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Erro durante atualização forçada:', error);
    reply.status(500).send({ error: 'Erro durante atualização forçada de dados' });
  }
});

app.get('/driver/most-valuable', async (req, reply) => {
  try {
    const topDrivers = await getHighValueDrivers();

    if (topDrivers.error) {
      return reply.status(500).send({error: topDrivers.error});
    }

    reply.send(topDrivers);
  } catch (error) {
    console.error("Error fetching top drivers data", error);
    reply.status(500).send({error: 'Failed to fetch most valuable drivers'});
  }
});