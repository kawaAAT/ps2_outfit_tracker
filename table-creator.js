module.exports =

  class TableCreator {
    constructor() {
      this._innerText = null;

      this._fs = require('fs');
    }

    generateTable(data) {
      const { players, mainStats, outfitName, fileName, startDate, endDate } = data;

      this._innerText = `<html><head><title>Outfit Stats</title></head><body>`;

      this._generateName(outfitName);
      this._generateDate(startDate, endDate);
      this._generateMainStats(mainStats);
      this._generatePlayersTable(players);

      this._innerText += `</body>`
      this._setStyles();
      this._innerText += `</html>`;

      this._fs.writeFile(fileName, this._innerText, function (err) { });
    }

    _generateName(outfitName) {
      this._innerText += `<h1>${outfitName}</h1>`;
    }

    _generateDate(startDate, endDate) {
      this._innerText += `<p><b>Start Date: </b> ${startDate}.</p>`;
      this._innerText += `<p><b>End Date: </b> ${endDate}.</p>`;
      this._innerText += `<br>`;
    }

    _generateMainStats(mainStats) {
      const { 
        topKiller, topHealer, topEngineer, averageKdr, averageHsr, 
        sumKills, captured, defended, capturedByOutfit, 
        longestKillstreak, longestDeathstreak 
      } = mainStats;

      this._innerText += `<p><b>Kills:</b> ${sumKills}.</p>`;
      this._innerText += `<p><b>Average KDR:</b> ${averageKdr}.</p>`;
      this._innerText += `<p><b>Average HSR:</b> ${averageHsr}%.</p>`;

      this._innerText += `<br>`;

      this._innerText += `<p><b>Captures:</b> ${captured} (by outfit itself: ${capturedByOutfit}).</p>`;
      this._innerText += `<p><b>Defences:</b> ${defended}.</p>`;

      this._innerText += `<br>`;

      this._innerText += `<p><b>Best killer:</b> ${topKiller}.</p>`;
      this._innerText += `<p><b>Best support:</b> ${topHealer}.</p>`;
      this._innerText += `<p><b>Best engineer:</b> ${topEngineer}.</p>`;

      this._innerText += `<br>`;

      this._innerText += `<p><b>Biggest killstreak:</b> ${longestKillstreak.ammount} by <b>${longestKillstreak.name}</b>.</p>`;
      this._innerText += `<p><b>Biggest deathstreak:</b> ${longestDeathstreak.ammount} by <b>${longestDeathstreak.name}</b>.</p>`;

      this._innerText += `<br>`;
    }

    _generatePlayersTable(players) {
      this._innerText += `<table>`;

      this._innerText += `<tr>`;
      this._innerText += `<th>Name:</th>`;
      this._innerText += `<th>KDR:</th>`;
      this._innerText += `<th>Kills:</th>`;
      this._innerText += `<th>Deaths:</th>`;
      this._innerText += `<th>HSR:</th>`;
      this._innerText += `<th>Assists:</th>`;
      this._innerText += `<th>Revives:</th>`;
      this._innerText += `<th>Repairs:</th>`;
      this._innerText += `<th>KPM:</th>`;
      this._innerText += `<th>Playtime(minutes):</th>`;
      this._innerText += `</tr>`;

      players.sort((a, b) => b.kills - a.kills);

      players.forEach(player => {
        if (player.kills !== 0 || player.deaths !== 0 || player.revives !== 0 || player.repairs !== 0) {
          this._innerText += `<tr>`;
          this._innerText += `<th>${player.name}</th>`;
          this._innerText += `<td>${player.kdr}</td>`;
          this._innerText += `<td>${player.kills}</td>`;
          this._innerText += `<td>${player.deaths}</td>`;
          this._innerText += `<td>${player.hsr}%</td>`;
          this._innerText += `<td>${player.assists}</td>`;
          this._innerText += `<td>${player.revives}</td>`;
          this._innerText += `<td>${player.repairs}</td>`;
          this._innerText += `<td>${player.kpm}</td>`;
          this._innerText += `<td>${player.playTime}</td>`;
          this._innerText += `</tr>`;
        }
      });

      this._innerText += `</table>`;
    }

    _setStyles() {
      this._innerText += `<style>`

      this._innerText += `body { margin: 10px 0 20px 10px }`;
      this._innerText += `p { font-size: 16pt; margin: 10px 0 }`;
      this._innerText += `table { border-collapse: collapse }`;
      this._innerText += `table, th, td { border: 1px solid black; font-size: 14pt }`;
      this._innerText += `th, td { padding: 2px 10px }`;
      this._innerText += `br { line-height: 75%; }`;
      
      this._innerText += `</style>`
    }    
  }
