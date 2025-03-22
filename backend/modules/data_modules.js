const axios = require('axios');

async function getRace(track, year) {
    const f1_calendar = {
        "australia": 1, "china": 2, "japan": 3,
        "bahrain": 4, "saudi_arabia": 5, "miami": 6, "imola": 7,
        "monaco": 8, "spain": 9, "canada": 10, "austria": 11, "united_kingdom": 12,
        "belgium": 13, "hungary": 14, "netherlands": 15, "italy": 16, "azerbaijan": 17,
        "singapore": 18, "usa": 19, "mexico": 20, "brazil": 21, "las_vegas":22, "qatar": 23,
        "abu_dhabi": 24 
    }
    const weekend_results = {};

    if (!(track in f1_calendar)) {
        return "Track not in calendar";
    }
    
    let URL = `https://api.jolpi.ca/ergast/f1/${year}/${f1_calendar[track]}/results/`
    let response;
    
    // For regular races
    try {
        response = await axios.get(URL);
        // return response.data;
    } catch (error) {
        console.error("Error fetching race data: ", error.message);
        return "Error fetching race data";
    }
    
    const race_results = response.data.MRData.RaceTable.Races[0].Results.map((results) => {
        return {
            driver_id: results.Driver.driverId,
            name: `${results.Driver.givenName} ${results.Driver.familyName}`,
            team: results.Constructor.name,
            grid_start: parseInt(results.grid),
            grid_finish: parseInt(results.position),
            positions_gained: parseInt(results.grid) - parseInt(results.position),
            race_points: parseInt(results.points),
            status: results.status,
            fastest_lap: results.FastestLap ? (results.FastestLap.rank == "1" ? true : false) : null 
        }
    })
    
    // For sprint races
    const sprint_races = {"china": 1, "miami": 6, "belgium": 13, "usa": 19, "brazil": 21, "qatar": 23};
    URL = `https://api.jolpi.ca/ergast/f1/${year}/${f1_calendar[track]}/sprint/`;
    if (track in sprint_races) {
        try {
            response = await axios.get(URL);
        } catch(error) {
            console.error("Error fetching sprint data: ", error.message);
            return "Error fetching sprint data";
        }

        const sprint_results = response.data.MRData.RaceTable.Races[0].SprintResults.map((results) => {
            return {
                driver_id: results.Driver.driverId,
                name: `${results.Driver.givenName} ${results.Driver.familyName}`,
                team: results.Constructor.name,
                grid_start: parseInt(results.grid),
                grid_finish: parseInt(results.position),
                positions_gained: parseInt(results.grid) - parseInt(results.position),
                sprint_points: parseInt(results.points),
                status: results.status,
                fastest_lap: results.FastestLap ? (results.FastestLap.rank == "1" ? true : false) : null
            }
        })

        weekend_results.sprint = sprint_results;
        weekend_results.race = race_results;

        return weekend_results;
    }

    weekend_results.race = race_results;
    return weekend_results;
}

async function getAllRacesData(year) {
    const f1_calendar = {
        "australia": 1, "china": 2, "japan": 3,
        "bahrain": 4, "saudi_arabia": 5, "miami": 6, "imola": 7,
        "monaco": 8, "spain": 9, "canada": 10, "austria": 11, "united_kingdom": 12,
        "belgium": 13, "hungary": 14, "netherlands": 15, "italy": 16, "azerbaijan": 17,
        "singapore": 18, "usa": 19, "mexico": 20, "brazil": 21, "las_vegas":22, "qatar": 23,
        "abu_dhabi": 24 
    };

    const allRacesData = {};
    
    // Iterar sobre todas as corridas no calendário
    for (const [track, raceNumber] of Object.entries(f1_calendar)) {
        console.log(`Fetching data for ${track} (Race ${raceNumber})...`);
        
        try {
            const raceData = await getRace(track, year);
            if (typeof raceData !== 'string') { // Se não for uma mensagem de erro
                allRacesData[track] = raceData;
                console.log(`Successfully fetched data for ${track}`);
            } else {
                console.log(`Skipping ${track}: ${raceData}`);
            }
        } catch (error) {
            console.error(`Error processing ${track}: ${error.message}`);
        }
        
        // Pequena pausa entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return allRacesData;
}

// Função para atualizar apenas corridas já realizadas
async function getCompletedRaces(year) {
    try {
        // Obter o calendário atual da API
        const response = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}`);
        const races = response.data.MRData.RaceTable.Races;
        
        const completedRaces = {};
        const today = new Date();
        
        for (const race of races) {
            const raceDate = new Date(race.date);
            const trackId = race.Circuit.circuitId;
            
            // Converter o ID da pista para o formato do seu calendário
            const trackKey = convertCircuitIdToTrackKey(trackId);
            
            // Se a corrida já aconteceu
            if (raceDate < today && trackKey) {
                console.log(`Fetching completed race: ${trackKey}`);
                const raceData = await getRace(trackKey, year);
                if (typeof raceData !== 'string') {
                    completedRaces[trackKey] = raceData;
                }
            }
        }
        
        return completedRaces;
    } catch (error) {
        console.error("Error fetching race calendar:", error.message);
        return {};
    }
}

// Função auxiliar para converter o circuitId da API para a chave usada no seu calendário
function convertCircuitIdToTrackKey(circuitId) {
    const mapping = {
        'albert_park': 'australia',
        'shanghai': 'china',
        'suzuka': 'japan',
        'bahrain': 'bahrain',
        'jeddah': 'saudi_arabia',
        'miami': 'miami',
        'imola': 'imola',
        'monaco': 'monaco',
        'catalunya': 'spain',
        'villeneuve': 'canada',
        'red_bull_ring': 'austria',
        'silverstone': 'united_kingdom',
        'spa': 'belgium',
        'hungaroring': 'hungary',
        'zandvoort': 'netherlands',
        'monza': 'italy',
        'baku': 'azerbaijan',
        'marina_bay': 'singapore',
        'americas': 'usa',
        'rodriguez': 'mexico',
        'interlagos': 'brazil',
        'las_vegas': 'las_vegas',
        'losail': 'qatar',
        'yas_marina': 'abu_dhabi'
    };
    
    return mapping[circuitId] || null;
}

async function getNextRace() {
  try {
    const currentYear = new Date().getFullYear();
    const response = await axios.get(`https://api.jolpi.ca/ergast/f1/${currentYear}`);
    const races = response.data.MRData.RaceTable.Races;
    
    const today = new Date();
    
    // Find the next race that hasn't happened yet
    for (const race of races) {
      const raceDate = new Date(race.date);
      
      if (raceDate > today) {
        return {
          track: race.Circuit.circuitId,
          name: race.raceName,
          date: race.date,
          time: race.time
        };
      }
    }
    
    return null; // No upcoming races found
  } catch (error) {
    console.error('Error getting next race:', error);
    return null;
  }
}

// Export the new function
module.exports = { getRace, getAllRacesData, getCompletedRaces, getNextRace };