const pool = require('../database/database');
const { getRace, getCompletedRaces } = require('./data_modules');

// Na função createTeam
const createTeam = async (nome, usuario_id) => {
    try {
        // Verificar se o usuário já possui uma equipe
        const [existingTeams] = await pool.execute(
            'SELECT * FROM equipes WHERE usuario_id = ?',
            [usuario_id]
        );
        
        if (existingTeams.length > 0) {
            return { error: 'User already has a team' };
        }
        
        // Defina um valor inicial razoável para o saldo (este é provavelmente o problema)
        const initialBalance = 100.00; // Coloque um valor menor aqui
        
        // Esta é a linha 19 onde o erro está ocorrendo
        await pool.execute(
            'UPDATE usuarios SET saldo = ? WHERE id = ?',
            [initialBalance, usuario_id]
        );
        
        // Criar a equipe
        const [result] = await pool.execute(
            'INSERT INTO equipes (nome, usuario_id) VALUES (?, ?)',
            [nome, usuario_id]
        );
        
        return { 
            message: 'Team created successfully',
            team_id: result.insertId,
            initialBalance: initialBalance
        };
    } catch (error) {
        console.error('Error creating team:', error);
        return { error: `Failed to create team: ${error.message}` };
    }
};

const getUserTeams = async (user_id) => {
    // Consulta mais completa que retorna dados úteis para o frontend
    const query = `
        SELECT 
            e.id, 
            e.nome, 
            e.usuario_id,
            u.saldo,  /* Saldo do usuário, não da equipe */
            COUNT(pe.piloto_id) AS total_drivers
        FROM 
            equipes e
        LEFT JOIN 
            usuarios u ON e.usuario_id = u.id
        LEFT JOIN 
            pilotos_equipes pe ON e.id = pe.equipe_id
        WHERE 
            e.usuario_id = ?
        GROUP BY 
            e.id, e.nome, e.usuario_id, u.saldo
    `;
    
    try {
        const [rows] = await pool.execute(query, [user_id]);
        
        // Se não encontrou nenhuma equipe
        if (rows.length === 0) {
            return [];
        }
        
        // Para cada equipe, buscar os pilotos
        for (let i = 0; i < rows.length; i++) {
            const driversQuery = `
                SELECT 
                    p.id,
                    p.nome,
                    p.valor,
                    p.equipe,
                    p.pontos,
                    p.fantasy_points
                FROM 
                    pilotos p
                JOIN 
                    pilotos_equipes pe ON p.id = pe.piloto_id
                WHERE 
                    pe.equipe_id = ?
            `;
            
            const [drivers] = await pool.execute(driversQuery, [rows[i].id]);
            rows[i].drivers = drivers;
        }
        
        return rows;
    } catch (error) {
        console.error('Error fetching user teams:', error);
        return { error: 'Failed to fetch user teams' };
    }
};

const syncDrivers = async () => {
    try {
        console.log('Starting to sync drivers...');
        
        // Obter o ano atual
        const currentYear = new Date().getFullYear();
        
        // Obter dados das corridas
        const racesData = await getCompletedRaces(currentYear);
        
        if (Object.keys(racesData).length === 0) {
            return { message: 'No races found, cannot sync drivers' };
        }
        
        // Extrair informações únicas dos pilotos
        const driversMap = {};
        
        // Processar todas as corridas para extrair informações dos pilotos
        for (const [track, data] of Object.entries(racesData)) {
            if (data.race) {
                for (const result of data.race) {
                    const driverId = result.driver_id;
                    if (!driversMap[driverId]) {
                        driversMap[driverId] = {
                            api_id: driverId,
                            nome: result.name,
                            equipe: result.team,
                            pontos: 0,
                            fantasy_points: 0,
                            valor: calculateDriverValue(result.team) // Função que determina o valor do piloto
                        };
                    }
                }
            }
            
            if (data.sprint) {
                for (const result of data.sprint) {
                    const driverId = result.driver_id;
                    if (!driversMap[driverId]) {
                        driversMap[driverId] = {
                            api_id: driverId,
                            nome: result.name,
                            equipe: result.team,
                            pontos: 0,
                            fantasy_points: 0,
                            valor: calculateDriverValue(result.team)
                        };
                    }
                }
            }
        }
        
        console.log(`Found ${Object.keys(driversMap).length} unique drivers in race data`);
        
        // Verificar quais pilotos já existem no banco de dados
        const [existingDrivers] = await pool.execute('SELECT id, nome, api_id FROM pilotos');
        const existingDriversMap = {};
        
        for (const driver of existingDrivers) {
            existingDriversMap[driver.api_id || driver.nome.toLowerCase()] = driver.id;
        }
        
        console.log(`Found ${Object.keys(existingDriversMap).length} existing drivers in database`);
        
        // Adicionar ou atualizar cada piloto
        let addedCount = 0;
        let updatedCount = 0;
        
        for (const [driverId, driverData] of Object.entries(driversMap)) {
            if (existingDriversMap[driverId] || existingDriversMap[driverData.nome.toLowerCase()]) {
                // Piloto já existe, atualizar
                const dbId = existingDriversMap[driverId] || existingDriversMap[driverData.nome.toLowerCase()];
                const updateQuery = `
                    UPDATE pilotos 
                    SET nome = ?, equipe = ?, api_id = ? 
                    WHERE id = ?
                `;
                
                await pool.execute(updateQuery, [
                    driverData.nome,
                    driverData.equipe,
                    driverData.api_id,
                    dbId
                ]);
                
                console.log(`Updated driver: ${driverData.nome}`);
                updatedCount++;
            } else {
                // Piloto não existe, adicionar
                const insertQuery = `
                    INSERT INTO pilotos 
                    (nome, equipe, pontos, fantasy_points, valor, api_id) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                await pool.execute(insertQuery, [
                    driverData.nome,
                    driverData.equipe,
                    driverData.pontos,
                    driverData.fantasy_points,
                    driverData.valor,
                    driverData.api_id
                ]);
                
                console.log(`Added new driver: ${driverData.nome}`);
                addedCount++;
            }
        }
        
        console.log(`Sync complete: Added ${addedCount} drivers, updated ${updatedCount} drivers`);
        return { 
            message: 'Drivers synced successfully', 
            added: addedCount, 
            updated: updatedCount 
        };
    } catch (error) {
        console.error('Error syncing drivers:', error);
        return { error: `Failed to sync drivers: ${error.message}` };
    }
};

// to-do: melhorar isso aqui para que o valor do piloto seja mais dinâmico
// Função auxiliar para calcular o valor do piloto com base na equipe
function calculateDriverValue(team) {
    // Valores base por equipe (ajuste conforme necessário)
    const teamValues = {
        'McLaren': 30,
        'Red Bull': 27,
        'Mercedes': 26,
        'Ferrari': 26,
        'Aston Martin': 18,
        'Williams': 16,
        'Alpine F1 Team': 15,
        'RB F1 Team': 10,
        'Haas F1 Team': 10,
        'Sauber': 8,
    };
    
    // Valor padrão se a equipe não estiver na lista
    const defaultValue = 15;
    
    return teamValues[team] || defaultValue;
}

const updateLastRace = async () => {
    try {
        // pegar as corridas mais recentes do ano atual
        const currentYear = new Date().getFullYear();
        const racesData = await getCompletedRaces(currentYear);
        
        // Log para debug
        console.log("Races data fetched:", Object.keys(racesData));
        
        // Se não tiver corridas, retorna
        if (Object.keys(racesData).length === 0) {
            return { message: 'No races found for the current year' };
        }

        console.log("Synchronizing drivers before updating races...");
        await syncDrivers();
        
        // Verificar quais corridas já estão no banco de dados
        const [existingRaces] = await pool.execute('SELECT DISTINCT track FROM corridas WHERE year = ?', [currentYear]);
        const existingTracksSet = new Set(existingRaces.map(race => race.track));
        
        console.log("Existing tracks:", existingTracksSet);
        
        // Processar cada corrida
        for (const [track, data] of Object.entries(racesData)) {
            // Pular se a corrida já estiver registrada
            if (existingTracksSet.has(track)) {
                console.log(`Race at ${track} already in database, skipping...`);
                continue;
            }
            
            console.log(`Adding new race data for ${track}`);
            
            // Verificar a estrutura dos dados para debugging
            console.log(`Race data structure for ${track}:`, 
                        data ? `Has data with keys: ${Object.keys(data).join(', ')}` : 'No data');
            console.log(`Race results available: ${data && data.race ? data.race.length : 0} entries`);
            
            // Processar os resultados da corrida principal
                        // Processar os resultados da corrida principal
            if (data.race) {
                for (const result of data.race) {
                    // Calcular fantasy points para esta corrida específica
                    let fantasyPoints = parseFloat(result.race_points) || 0;
                    
                    // Adicionar pontos por posições ganhas (se positivas)
                    if (result.positions_gained > 0) {
                        fantasyPoints += result.positions_gained;
                    }
                    
                    // Adicionar pontos por volta mais rápida
                    if (result.fastest_lap) {
                        fantasyPoints += 3;
                    }
                    
                    const insertQuery = `
                        INSERT INTO corridas 
                        (track, year, driver_id, name, team, grid_start, grid_finish, positions_gained, 
                        race_points, fantasy_points, status, fastest_lap, race_type) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'race')
                    `;
                    
                    try {
                        await pool.execute(insertQuery, [
                            track,
                            currentYear,
                            result.driver_id,
                            result.name,
                            result.team,
                            result.grid_start,
                            result.grid_finish,
                            result.positions_gained,
                            result.race_points,
                            fantasyPoints,  // Nova coluna fantasy_points
                            result.status,
                            result.fastest_lap ? 1 : 0
                        ]);
                        console.log(`Added race result for driver ${result.name} at ${track} (Fantasy Points: ${fantasyPoints})`);
                    } catch (error) {
                        console.error(`Error inserting race result for ${result.name} at ${track}:`, error.message);
                    }
                }
            }
            
            // Processar os resultados da sprint, se existirem
            if (data.sprint) {
                for (const result of data.sprint) {
                    // Calcular fantasy points para esta sprint específica
                    let fantasyPoints = parseFloat(result.sprint_points) || 0;
                    
                    // Adicionar pontos por posições ganhas (se positivas)
                    fantasyPoints += result.positions_gained;
                    
                    
                    // Adicionar pontos por volta mais rápida
                    if (result.fastest_lap) {
                        fantasyPoints += 1;
                    }
                    
                    const insertQuery = `
                        INSERT INTO corridas 
                        (track, year, driver_id, name, team, grid_start, grid_finish, positions_gained, 
                        race_points, fantasy_points, status, fastest_lap, race_type) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sprint')
                    `;
                    
                    try {
                        await pool.execute(insertQuery, [
                            track,
                            currentYear,
                            result.driver_id,
                            result.name,
                            result.team,
                            result.grid_start,
                            result.grid_finish,
                            result.positions_gained,
                            result.sprint_points,
                            fantasyPoints,  // Nova coluna fantasy_points
                            result.status,
                            result.fastest_lap ? 1 : 0
                        ]);
                        console.log(`Added sprint result for driver ${result.name} at ${track} (Fantasy Points: ${fantasyPoints})`);
                    } catch (error) {
                        console.error(`Error inserting sprint result for ${result.name} at ${track}:`, error.message);
                    }
                }
            }
        }
        
        await updateRealDriverPoints(); // Atualizar os pontos reais primeiro
        await updateDriverPoints();     // Depois os pontos de fantasia
        await updateDriverValues();   
        
        return { message: 'Race data updated successfully' };
    } catch (error) {
        console.error('Error updating race data:', error);
        return { error: `Failed to update race data: ${error.message}` };
    }
};

// Função para atualizar os valores dos pilotos com base no desempenho recente
const updateDriverValues = async () => {
    try {
        console.log('Starting to update driver values based on recent performance...');
        
        // Obter todos os pilotos
        const [drivers] = await pool.execute('SELECT id, nome, valor, equipe FROM pilotos');
        const currentYear = new Date().getFullYear();
        
        // Processar cada piloto
        for (const driver of drivers) {
            console.log(`Evaluating value for driver: ${driver.nome}`);
            
            // Obter desempenho nas últimas 3 corridas (se disponíveis)
            const [recentPerformance] = await pool.execute(
                `SELECT SUM(fantasy_points) as recent_points, COUNT(*) as race_count
                 FROM corridas 
                 WHERE name = ? AND year = ? 
                 ORDER BY id DESC LIMIT 3`,
                [driver.nome, currentYear]
            );
            
            if (!recentPerformance[0].race_count) {
                console.log(`No recent races found for ${driver.nome}, keeping current value`);
                continue;
            }
            
            const recentPoints = recentPerformance[0].recent_points || 0;
            const raceCount = recentPerformance[0].race_count || 0;
            
            if (raceCount === 0) continue;
            
            // Calcular média de pontos por corrida
            const avgPoints = recentPoints / raceCount;
            console.log(`${driver.nome} recent performance: ${recentPoints} points in ${raceCount} races (avg: ${avgPoints.toFixed(2)})`);
            
            // Valor base da equipe (para referência e limites)
            const baseEquipeValue = calculateDriverValue(driver.equipe);
            
            // Utilizar o valor atual do piloto como referência para o reajuste
            const currentValue = driver.valor;
            
            // Ajustar valor com base no desempenho recente
            // Exemplo de lógica: aumentar/diminuir valor em até 30% com base no desempenho
            let valueModifier = 0;
            
            if (avgPoints > 15) {
                // Excelente desempenho: +5% a 15% do valor atual
                valueModifier = Math.min(0.15, 0.05 + (avgPoints - 15) * 0.01);
            } else if (avgPoints > 8) {
                // Bom desempenho: +0% a +5% do valor atual
                valueModifier = (avgPoints - 8) * 0.007;
            } else if (avgPoints > 5) {
                // Desempenho médio: -5% a 0% do valor atual
                valueModifier = (avgPoints - 5) * 0.015 - 0.05;
            } else {
                // Desempenho fraco: -5% a -15% do valor atual
                valueModifier = Math.max(-0.15, -0.05 - (5 - avgPoints) * 0.025);
            }
            
            // Calcular novo valor baseado no valor atual
            let newValue = currentValue * (1 + valueModifier);
            
            // Limites para evitar valores extremos:
            // 1. Não pode ficar abaixo de 70% do valor base da equipe
            const minValue = Math.round(baseEquipeValue * 0.7);
            // 2. Não pode ficar acima de 500% do valor base da equipe
            const maxValue = Math.round(baseEquipeValue * 5.0);
            
            // Aplicar os limites
            newValue = Math.min(maxValue, Math.max(minValue, newValue));
            
            console.log(`${driver.nome} value adjustment: ${(valueModifier * 100).toFixed(1)}%`);
            console.log(`Base equipe: ${baseEquipeValue}, Current: ${currentValue}, New: ${newValue}`);
            console.log(`Limits applied: Min=${minValue}, Max=${maxValue}`);
            
            // Atualizar o valor do piloto se houver mudança
            if (newValue !== currentValue) {
                await pool.execute('UPDATE pilotos SET valor = ? WHERE id = ?', [newValue, driver.id]);
                console.log(`Updated value for ${driver.nome}: ${currentValue} -> ${newValue} (${((newValue - currentValue) / currentValue * 100).toFixed(1)}% change)`);
            } else {
                console.log(`Value unchanged for ${driver.nome}: ${currentValue}`);
            }
        }
        
        console.log('Driver values updated successfully based on recent performance');
        return { message: 'Driver values updated successfully' };
    } catch (error) {
        console.error('Error updating driver values:', error);
        return { error: `Failed to update driver values: ${error.message}` };
    }
};
// Função para atualizar os pontos dos pilotos baseado em todas as corridas do ano
const updateDriverPoints = async () => {
    try {
        console.log('Starting to update driver fantasy points...');
        
        // Obter todos os pilotos
        const [drivers] = await pool.execute('SELECT * FROM pilotos');
        
        // Obter o ano atual
        const currentYear = new Date().getFullYear();
        
        // Processar cada piloto do banco de dados
        for (const driver of drivers) {
            console.log(`Processing driver: ${driver.nome} (ID: ${driver.id})`);
            
            // Obter ID do piloto nas corridas
            const [driverIds] = await pool.execute(
                'SELECT DISTINCT driver_id FROM corridas WHERE name = ?',
                [driver.nome]
            );
            
            if (driverIds.length === 0) {
                console.log(`No race data found for driver: ${driver.nome}`);
                continue;
            }
            
            const raceDriverId = driverIds[0].driver_id;
            
            // Obter pontos de corrida para este piloto
            const [racePoints] = await pool.execute(
                'SELECT SUM(race_points) as total FROM corridas WHERE driver_id = ? AND year = ? AND race_type != "sprint"',
                [raceDriverId, currentYear]
            );
            
            // Obter pontos de posições ganhas
            const [positionsGained] = await pool.execute(
                'SELECT SUM(positions_gained) as total FROM corridas WHERE driver_id = ? AND year = ?',
                [raceDriverId, currentYear]
            );
            
            // Obter voltas mais rápidas
            const [fastestLaps] = await pool.execute(
                'SELECT SUM(fastest_lap) as total FROM corridas WHERE driver_id = ? AND year = ?',
                [raceDriverId, currentYear]
            );
            
            console.log(`  Race points: ${racePoints[0].total || 0}`);
            console.log(`  Positions gained: ${positionsGained[0].total || 0}`);
            console.log(`  Fastest laps: ${fastestLaps[0].total || 0}`);
            
            // Calcular pontos totais (base)
            let totalPoints = (parseFloat(racePoints[0].total) || 0) + 
                             (parseFloat(positionsGained[0].total) || 0) + 
                             ((parseInt(fastestLaps[0].total) || 0) * 3);
            
            console.log(`  Base fantasy points calculated for ${driver.nome}: ${totalPoints}`);

            // Round totalPoints to 1 decimal place
            totalPoints = parseFloat(totalPoints.toFixed(1));

            // Encontrar equipes que possuem este piloto
            const [ownerTeams] = await pool.execute(
                'SELECT equipe_id FROM pilotos_equipes WHERE piloto_id = ?',
                [driver.id]
            );

            // Para cada equipe do piloto, calcular pontos com multiplicadores
            for (const teamEntry of ownerTeams) {
                const equipeId = teamEntry.equipe_id;
                
                // Buscar estruturas que a equipe possui
                const [teamStructures] = await pool.execute(
                    `SELECT ts.multiplier_type, ts.multiplier_value, tso.current_level
                     FROM team_structures_owned tso
                     JOIN team_structures ts ON tso.structure_id = ts.id
                     WHERE tso.equipe_id = ?`,
                    [equipeId]
                );
                
                // Aplicar multiplicadores específicos para cada estrutura
                let finalFantasyPoints = totalPoints;
                
                // Debug: Mostrar estruturas encontradas
                console.log(`  Team ${equipeId} has ${teamStructures.length} structures`);
                
                for (const structure of teamStructures) {
                    // O multiplicador cresce com o nível (20% por nível)
                    const multiplier = parseFloat(structure.multiplier_value) * 
                                      (1 + (structure.current_level - 1) * 0.2);
                    
                    console.log(`  Processing structure: ${structure.multiplier_type}, level ${structure.current_level}, multiplier ${multiplier.toFixed(2)}`);
                    
                    switch(structure.multiplier_type) {
                        case 'fastest_lap':
                            // Aplicar apenas aos pontos de volta mais rápida
                            const fastLapPoints = (parseInt(fastestLaps[0].total) || 0) * 3;
                            const fastLapBonus = (fastLapPoints * multiplier) - fastLapPoints;
                            finalFantasyPoints += fastLapBonus;
                            console.log(`    Added ${fastLapBonus.toFixed(2)} fastest lap bonus`);
                            break;
                            
                        case 'positions_gained':
                            // Aplicar aos pontos de posições ganhas
                            const posGainedPoints = (parseFloat(positionsGained[0].total) || 0);
                            const posGainedBonus = (posGainedPoints * multiplier) - posGainedPoints;
                            finalFantasyPoints += posGainedBonus;
                            console.log(`    Added ${posGainedBonus.toFixed(2)} positions gained bonus`);
                            break;
                            
                        case 'qualifying_outperform':
                            // Pontos extras quando o piloto termina em posição melhor que a largada
                            const [qualifyingData] = await pool.execute(
                                `SELECT SUM(grid_finish - grid_start) as grid_improvement, 
                                        COUNT(*) as race_count
                                 FROM corridas 
                                 WHERE driver_id = ? AND year = ? AND (grid_finish < grid_start)`,
                                [raceDriverId, currentYear]
                            );
                            
                            const gridImprovement = parseFloat(qualifyingData[0].grid_improvement || 0) * -1;
                            const raceCount = parseInt(qualifyingData[0].race_count || 0);
                            
                            if (raceCount > 0 && gridImprovement > 0) {
                                const qualifyPoints = gridImprovement * 2;
                                const qualifyBonus = (qualifyPoints * multiplier) - qualifyPoints;
                                finalFantasyPoints += qualifyBonus;
                                console.log(`    Added ${qualifyBonus.toFixed(2)} qualifying bonus`);
                            }
                            break;
                            
                        case 'reliability':
                            // Pontos extras por terminar corridas
                            const [reliabilityData] = await pool.execute(
                                `SELECT COUNT(*) as finished_races,
                                        SUM(CASE WHEN status = 'Finished' THEN 1 ELSE 0 END) as clean_races
                                 FROM corridas 
                                 WHERE driver_id = ? AND year = ?`,
                                [raceDriverId, currentYear]
                            );
                            
                            const totalRaces = parseInt(reliabilityData[0].finished_races || 0);
                            const cleanRaces = parseInt(reliabilityData[0].clean_races || 0);
                            
                            if (totalRaces > 0) {
                                const reliabilityPoints = cleanRaces * 5;
                                const reliabilityBonus = (reliabilityPoints * multiplier) - reliabilityPoints;
                                finalFantasyPoints += reliabilityBonus;
                                console.log(`    Added ${reliabilityBonus.toFixed(2)} reliability bonus`);
                            }
                            break;
                            
                        case 'all_points':
                            // Aplicar a todos os pontos
                            finalFantasyPoints = totalPoints * multiplier;
                            console.log(`    Applied ${multiplier.toFixed(2)}x total multiplier, adjusted points: ${finalFantasyPoints.toFixed(2)}`);
                            break;
                            
                        default:
                            console.log(`    Unknown multiplier type: ${structure.multiplier_type}`);
                    }
                }
                
                console.log(`  Final fantasy points for driver ${driver.nome} in team ${equipeId}: ${finalFantasyPoints.toFixed(2)}`);
                
                // Atualizar na tabela pilotos_equipes
                await pool.execute(
                    'UPDATE pilotos_equipes SET fantasy_points_adjusted = ? WHERE piloto_id = ? AND equipe_id = ?',
                    [finalFantasyPoints, driver.id, equipeId]
                );
                
                // Confirmar que a atualização foi feita (para debug)
                const [checkUpdate] = await pool.execute(
                    'SELECT fantasy_points_adjusted FROM pilotos_equipes WHERE piloto_id = ? AND equipe_id = ?',
                    [driver.id, equipeId]
                );
                
                if (checkUpdate.length > 0) {
                    console.log(`  Confirmed update: fantasy_points_adjusted = ${checkUpdate[0].fantasy_points_adjusted}`);
                } else {
                    console.log(`  WARNING: Could not confirm update`);
                }
            }

            // Atualizar fantasy_points do piloto (os pontos base, sem multiplicadores)
            await pool.execute(
                'UPDATE pilotos SET fantasy_points = ? WHERE id = ?',
                [totalPoints, driver.id]
            );
        }
        
        console.log('All driver points updated successfully');
        return { message: 'Driver points updated successfully' };
    } catch (error) {
        console.error('Error updating driver points:', error);
        return { error: `Failed to update driver points: ${error.message}` };
    }
};

const updateRealDriverPoints = async () => {
    try {
        console.log('Atualizando pontos reais dos pilotos...');
        
        // Obter todos os pilotos
        const [drivers] = await pool.execute('SELECT id, nome FROM pilotos');
        
        // Obter o ano atual
        const currentYear = new Date().getFullYear();
        
        // Processar cada piloto
        for (const driver of drivers) {
            console.log(`Processando piloto: ${driver.nome} (ID: ${driver.id})`);
            
            // Obter ID do piloto nas corridas (usando o nome para correspondência)
            const [driverIds] = await pool.execute(
                'SELECT DISTINCT driver_id FROM corridas WHERE name = ?',
                [driver.nome]
            );
            
            if (driverIds.length === 0) {
                console.log(`Nenhum dado de corrida encontrado para: ${driver.nome}`);
                continue;
            }
            
            const raceDriverId = driverIds[0].driver_id;
            
            // Obter todos os pontos de corrida para este piloto
            const [racePointsData] = await pool.execute(
                'SELECT SUM(race_points) as total FROM corridas WHERE driver_id = ? AND year = ?',
                [raceDriverId, currentYear]
            );
            
            const racePoints = parseFloat(racePointsData[0].total || 0);
            console.log(`Pontos totais de corrida para ${driver.nome}: ${racePoints}`);
            
            // Atualizar os pontos reais do piloto
            await pool.execute(
                'UPDATE pilotos SET pontos = ? WHERE id = ?',
                [racePoints, driver.id]
            );
            
            console.log(`Pontos atualizados para ${driver.nome}: ${racePoints}`);
        }
        
        console.log('Pontos reais dos pilotos atualizados com sucesso');
        return { message: 'Pontos reais dos pilotos atualizados com sucesso' };
    } catch (error) {
        console.error('Erro ao atualizar pontos reais dos pilotos:', error);
        return { error: `Falha ao atualizar pontos reais dos pilotos: ${error.message}` };
    }
};

const buyDriver = async (nome, team_id) => {
    const query = 'SELECT * FROM pilotos WHERE api_id = ?';
    const [rows] = await pool.execute(query, [nome]);

    if (rows.length === 0) {
        return { error: 'Driver not found' };
    }

    const driver = rows[0];
    const driver_id = driver.id;
    const price = driver.valor;

    const userQuery = 'SELECT u.id, u.saldo FROM usuarios u JOIN equipes e ON u.id = e.usuario_id WHERE e.id = ?';
    const [userRows] = await pool.execute(userQuery, [team_id]);
    
    if (userRows.length === 0) {
        return { error: 'Team not found' };
    }
    
    const user = userRows[0];
    const usuario_id = user.id;  
    const saldo = parseFloat(user.saldo);  // Modified: convert saldo to a number

    if (saldo < price) {
        return { error: 'Insufficient balance' };
    }

    // Verificar se o piloto já está na equipe
    const verifyQuery = 'SELECT * FROM pilotos_equipes WHERE piloto_id = ? AND equipe_id = ?';
    const [verifyRows] = await pool.execute(verifyQuery, [driver_id, team_id]);

    if (verifyRows.length > 0) {
        return { error: 'Driver already in team' };
    }

    // Adicionar o piloto na equipe
    const addQuery = 'INSERT INTO pilotos_equipes (piloto_id, equipe_id) VALUES (?, ?)';
    await pool.execute(addQuery, [driver_id, team_id]);

    // Atualizar o saldo do usuário (agora usando o usuario_id correto)
    const newBalance = saldo - price;
    const updateQuery = 'UPDATE usuarios SET saldo = ? WHERE id = ?';
    await pool.execute(updateQuery, [newBalance, usuario_id]);

    return { message: 'Driver added' };
};

const sellDriver = async (name, team_id) => {
    const query = 'SELECT * FROM pilotos WHERE api_id = ?';
    const [rows] = await pool.execute(query, [name]);

    if (rows.length === 0) {
        return { error: 'Driver not found' };
    }

    const driver = rows[0];
    const driver_id = driver.id;
    const price = driver.valor;

    const userQuery = 'SELECT u.id, u.saldo FROM usuarios u JOIN equipes e ON u.id = e.usuario_id WHERE e.id = ?';
    const [userRows] = await pool.execute(userQuery, [team_id]);
    
    if (userRows.length === 0) {
        return { error: 'Team not found' };
    }
    
    const user = userRows[0];
    const usuario_id = user.id;  
    const saldo = parseFloat(user.saldo); // Garantir que é um número

    // Verificar se o piloto está na equipe
    const verifyQuery = 'SELECT * FROM pilotos_equipes WHERE piloto_id = ? AND equipe_id = ?';
    const [verifyRows] = await pool.execute(verifyQuery, [driver_id, team_id]);

    if (verifyRows.length === 0) {
        return { error: 'Driver not in team' };
    }

    // Remover o piloto da equipe
    const removeQuery = 'DELETE FROM pilotos_equipes WHERE piloto_id = ? AND equipe_id = ?';
    await pool.execute(removeQuery, [driver_id, team_id]);

    // Calcular novo saldo - usar parseFloat para garantir formato correto
    const newBalance = parseFloat(saldo) + parseFloat(price);
    
    // Para debug
    console.log(`Saldo atual: ${saldo}, Preço: ${price}, Novo saldo: ${newBalance}`);
    
    // Atualizar o saldo do usuário
    const updateQuery = 'UPDATE usuarios SET saldo = ? WHERE id = ?';
    await pool.execute(updateQuery, [newBalance, usuario_id]);

    return { message: 'Driver sold' };
}

// Função para listar estruturas disponíveis
const getAvailableStructures = async () => {
    try {
        const [structures] = await pool.execute('SELECT * FROM team_structures');
        return structures;
    } catch (error) {
        console.error('Error fetching structures:', error);
        return { error: 'Failed to fetch structures' };
    }
};

// Função para comprar uma estrutura para uma equipe
// Na função buyTeamStructure
const buyTeamStructure = async (structure_id, equipe_id) => {
    try {
        // Verificar se a estrutura existe
        const [structureData] = await pool.execute(
            'SELECT * FROM team_structures WHERE id = ?', 
            [structure_id]
        );
        
        if (structureData.length === 0) {
            return { error: 'Structure not found' };
        }
        
        // Verificar se a equipe já possui esta estrutura
        const [existingStructure] = await pool.execute(
            'SELECT * FROM team_structures_owned WHERE structure_id = ? AND equipe_id = ?',
            [structure_id, equipe_id]
        );
        
        if (existingStructure.length > 0) {
            return { error: 'Team already owns this structure' };
        }
        
        // Verificar saldo do usuário
        const [userInfo] = await pool.execute(
            'SELECT u.id, u.saldo FROM usuarios u JOIN equipes e ON u.id = e.usuario_id WHERE e.id = ?',
            [equipe_id]
        );
        
        if (userInfo.length === 0) {
            return { error: 'Team not found' };
        }
        
        const baseCost = parseFloat(structureData[0].base_cost);
        const currentBalance = parseFloat(userInfo[0].saldo);
        
        console.log("Debugging purchase:");
        console.log(`Structure: ${structureData[0].name} (ID: ${structure_id})`);
        console.log(`Team ID: ${equipe_id}`);
        console.log(`Raw base cost from DB: ${structureData[0].base_cost}`);
        console.log(`Converted base cost: ${baseCost}`);
        console.log(`Current balance: ${currentBalance}`);
        
        if (baseCost > currentBalance) {
            return { 
                error: `Insufficient balance. Required: ${baseCost}, Available: ${currentBalance}`,
                debug: {
                    structure: structureData[0],
                    user: userInfo[0],
                    convertedCost: baseCost
                }
            };
        }
        
        // Comprar a estrutura
        await pool.execute(
            'INSERT INTO team_structures_owned (equipe_id, structure_id) VALUES (?, ?)',
            [equipe_id, structure_id]
        );
        
        // Atualizar o saldo
        const newBalance = currentBalance - baseCost;
        await pool.execute(
            'UPDATE usuarios SET saldo = ? WHERE id = ?',
            [newBalance, userInfo[0].id]
        );
        
        return { 
            message: 'Structure purchased successfully', 
            structureName: structureData[0].name,
            cost: baseCost,
            newBalance: newBalance
        };
    } catch (error) {
        console.error('Error buying structure:', error);
        return { error: `Failed to buy structure: ${error.message}` };
    }
};
// Função para melhorar nível de uma estrutura
const upgradeTeamStructure = async (structure_owned_id, equipe_id) => {
    try {
        // Verificar se a equipe possui esta estrutura
        const [structureOwned] = await pool.execute(
            `SELECT tso.*, ts.name, ts.base_cost, ts.max_level 
             FROM team_structures_owned tso
             JOIN team_structures ts ON tso.structure_id = ts.id
             WHERE tso.id = ? AND tso.equipe_id = ?`,
            [structure_owned_id, equipe_id]
        );
        
        if (structureOwned.length === 0) {
            return { error: 'Structure not owned by this team' };
        }
        
        const currentLevel = structureOwned[0].current_level;
        const maxLevel = structureOwned[0].max_level;
        
        if (currentLevel >= maxLevel) {
            return { error: 'Structure already at maximum level' };
        }
        
        // Calcular custo da atualização (aumenta 50% por nível)
        const baseCost = structureOwned[0].base_cost;
        const upgradeCost = baseCost * (currentLevel * 0.5);
        
        // Verificar saldo
        const [userInfo] = await pool.execute(
            'SELECT u.id, u.saldo FROM usuarios u JOIN equipes e ON u.id = e.usuario_id WHERE e.id = ?',
            [equipe_id]
        );
        
        if (userInfo.length === 0) {
            return { error: 'Team not found' };
        }
        
        const currentBalance = userInfo[0].saldo;
        
        if (upgradeCost > currentBalance) {
            return { error: 'Insufficient balance' };
        }
        
        // Atualizar o nível
        await pool.execute(
            'UPDATE team_structures_owned SET current_level = ? WHERE id = ?',
            [currentLevel + 1, structure_owned_id]
        );
        
        // Atualizar o saldo
        const newBalance = currentBalance - upgradeCost;
        await pool.execute(
            'UPDATE usuarios SET saldo = ? WHERE id = ?',
            [newBalance, userInfo[0].id]
        );
        
        return { 
            message: 'Structure upgraded successfully', 
            newLevel: currentLevel + 1,
            newBalance: newBalance
        };
    } catch (error) {
        console.error('Error upgrading structure:', error);
        return { error: `Failed to upgrade structure: ${error.message}` };
    }
};

module.exports = { 
    createTeam, 
    getUserTeams, 
    buyDriver, 
    sellDriver,
    updateLastRace, 
    updateDriverPoints,
    updateDriverValues,
    getAvailableStructures,
    buyTeamStructure,
    upgradeTeamStructure
};