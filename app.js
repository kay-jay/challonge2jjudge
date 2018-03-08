const challongeNode = require("challonge-node-ng");
const fs = require("fs");
const mustache = require("mustache");
const challonge = challongeNode.withAPIKey(process.argv[2]);

async function getPlayers(tid) {
    return await challonge.participants.index(tid);
}

async function getTournament(tid) {
    return await challonge.tournaments.show(tid);
}

async function getMatches(tid, players) {
    const challongeMatches = await challonge.matches.index(tid);
    return challongeMatches.map(m => {
        return {
            player1: players.find(p => p.id === m.player1_id).display_name,
            player1_winner: m.player1_id === m.winner_id,
            player2: players.find(p => p.id === m.player2_id).display_name,
            player2_winner: m.player2_id === m.winner_id,
            score: m.scores_csv,
            round: m.round
        }
    });
}

function getTournamentId(url) {
    const regex = /^http[s]?:\/\/([\w-_]*)\.?challonge\.com\/(.+)/;
    const match = regex.exec(url);
    if (match.length === 3)
        return match[1] + '-' + match[2];
    else return match[2];
}

(async () => {
    const tournamentId = getTournamentId(process.argv[3]);
    const tournament = await getTournament(tournamentId);
    const players = await getPlayers(tournamentId);
    const url = process.argv[3] + '/module?theme=1&show_final_results=1&show_standings=1&scale_to_fit=1';
    const ranks = [...new Set(players.map(p => {
        return p.final_rank
    }))].sort((a,b) => a - b );
    const standings = ranks.map(r => {
        return players.filter(p => {
            return p.final_rank === r
        }).map(p => {
            return p.display_name.replace(' | ', '_');
        }).join(',');
    }).join('|');
    const template = fs.readFileSync('bracket.mst','utf8');
    const mst = mustache.render(template,{results: standings, title: tournament.name, game: tournament.game_name, url: url, pretty: true});
    fs.writeFileSync('bracket-' + tournamentId + '.html',mst);
})();