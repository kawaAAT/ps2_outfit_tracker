module.exports =

  class OutfitTracker {
    constructor() {
      this._fs = require('fs');
      this._request = require("sync-request");

      this._webSockets = null;
      this._connectionOpen = false;

      this._startDate = null;
      this._endDate = null;

      this._facilityDelay = 5000;
      this._captured = 0;
      this._capturedByOutfit = 0;
      this._defended = 0;
      this._canCapture = true;
      this._canDefend = true;

      this._longestKillstreak = {
        ammount: 0,
        name: 'none'
      };
      this._longestDeathstreak = {
        ammount: 0,
        name: 'none'
      };

      this._sid = "kawaAAT";
      this._outfitName = '';
      this._outfitId = '';
      this._allPlayers = [];

      const TableCreator = require('./table-creator');
      this._tableCreator = new TableCreator();
    }

    run(tag) {
      this._connectWebsocket(tag);

      this._startDate = new Date().toLocaleString();
      this._outputName = `stats_${this._startDate.replace(/:/g, '-').replace(' ', '_')}.html`;
    }

    stop() {
      if (this._webSockets)
        this._webSockets.close();
    }

    _connectWebsocket(tag) {
      const WebSocketClient = require('websocket').w3cwebsocket;

      const url = "wss://push.planetside2.com/streaming?environment=ps2&service-id=s:" + this._sid;
      this._allPlayers = this._getAllPlayers(tag);

      const playersIds = this._allPlayers.map(x => x.id);
      const expEvents = this._generateXpEvents();

      const openConnection = () => {
        const ws = this._webSockets = new WebSocketClient(url);

        ws.onopen = () => {
          console.log(`Started tracking, target: ${this._outfitName}!`);

          ws.send(JSON.stringify({
            "service": "event",
            "action": "subscribe",
            "characters": [...playersIds],
            "eventNames": [...expEvents, "Death", "PlayerFacilityCapture", "PlayerFacilityDefend"]
          }));

          this._connectionOpen = true;
          this._startTableUpdateLoop();
        };
        ws.onmessage = e => {
          this._processEvent(JSON.parse(e.data));
        };
        ws.onclose = e => {
          this._connectionOpen = false;
          this._generateTable();

          console.log('Connection closed!');
        };
        ws.onerror = () => {
          console.log('Error!');
        };
      };

      openConnection();
    }

    _startTableUpdateLoop() {
      const update = () => {
        this._generateTable();

        setTimeout(() => {
          if (this._connectionOpen)
            update();
        }, 5000);
      };

      update();
    }

    _getAllPlayers(tag) {
      const res = this._request('GET', `https://census.daybreakgames.com/get/ps2:v2/outfit/?alias=${tag}&c:resolve=member_character`);
      const allMembers = JSON.parse(res.getBody()).outfit_list[0].members;
      this._outfitName = JSON.parse(res.getBody()).outfit_list[0].name;
      this._outfitId = JSON.parse(res.getBody()).outfit_list[0].outfit_id;

      const tempArr = [];
      const msFromLastLogIn = 800000;

      allMembers.forEach(member => {
        if (member.name) {
          // filter inactive players in big outfits to prevent app overload
          if (allMembers.length < 600 || Date.now() / 1000 - member.times.last_login < msFromLastLogIn) {
            const data = {
              id: member.character_id,
              name: member.name.first,
              kills: 0,
              deaths: 0,
              kdr: 0,
              hsr: 0,
              kpm: 0,
              revives: 0,
              headshots: 0,
              assists: 0,
              repairs: 0,
              resupplies: 0,
              heals: 0,
              startTime: null,
              playTime: 0,
              killstreak: 0,
              deathstreak: 0
            };

            tempArr.push(data);
          }
        }
      });

      return tempArr;
    }

    _generateXpEvents() {
      const countableEvents = [
        1, 29, 37, 2, 550, 551, 552, 553, 554, 555, 4, 51, 6, 28, 31,
        88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 129,
        130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142,
        276, 302, 584, 34, 55, 7, 53
      ];

      const array = countableEvents.map(x => 'GainExperience_experience_id_' + x);
      return array;
    }

    _addStat(id, stat) {
      this._allPlayers.forEach(player => {
        if (player.id === id) {
          player[stat]++;

          if (stat === 'kills') {
            this._updateKdr(player);
            this._updateHsr(player);
            this._updateStreak(player, true);
          }
          else if (stat === 'headshots') {
            this._updateHsr(player);
          }
          else if (stat === 'deaths') {
            this._updateKdr(player);
            this._updateStreak(player, false);
          }

          if (!player.startTime) {
            player.startTime = Date.now();
          }

          player.playTime = Math.ceil((Date.now() - player.startTime) / 60000);

          this._updateKpm(player);
        }
      });
    }

    _addCapture(outfitId) {
      if (this._canCapture) {
        this._captured++;
        this._canCapture = false;

        if (outfitId === this._outfitId)
          this._capturedByOutfit++;

        setTimeout(() => this._canCapture = true, this._facilityDelay);
      }
    }

    _addDefense() {
      if (this._canDefend) {
        this._defended++;
        this._canDefend = false;

        setTimeout(() => this._canDefend = true, this._facilityDelay);
      }
    }

    _updateKdr(player) {
      player.kdr = player.deaths === 0 ? player.kills : Math.round((player.kills / player.deaths) * 100) / 100;
    }

    _updateHsr(player) {
      player.hsr = player.headshots !== 0 && player.kills !== 0 ? Math.round((player.headshots / player.kills) * 1000) / 10 : 0;
    }

    _updateKpm(player) {
      player.kpm = player.kills === 0 || player.playTime === 0 ? 0 : Math.round(player.kills  / player.playTime * 100) / 100;
    }

    _updateStreak(player, isKill) {
      if (isKill) {
        player.killstreak++;
        player.deathstreak = 0;
      }
      else {
        player.deathstreak++;
        player.killstreak = 0;
      }

      if (player.killstreak > this._longestKillstreak.ammount) {
        this._longestKillstreak.ammount = player.killstreak;
        this._longestKillstreak.name = player.name;
      }

      if (player.deathstreak > this._longestDeathstreak.ammount) {
        this._longestDeathstreak.ammount = player.deathstreak;
        this._longestDeathstreak.name = player.name;
      }
    }

    _findByTopStat(stat) {
      let max = 'none';
      let maxNum = 0;

      this._allPlayers.forEach(member => {
        if (member[stat] > maxNum) {
          maxNum = member[stat];
          max = member.name;
        }
      });

      return [max, maxNum];
    }

    _findAverageKdr() {
      let kills = 0;
      let deaths = 0;

      this._allPlayers.forEach(member => {
        kills += member.kills;
        deaths += member.deaths;
      });

      return deaths !== 0 ? Math.round(kills / deaths * 100) / 100 : kills;
    }

    _findAverageHsr() {
      let kills = 0;
      let headshots = 0;

      this._allPlayers.forEach(member => {
        kills += member.kills;
        headshots += member.headshots;
      });

      return headshots !== 0 ? Math.round(headshots / kills * 1000) / 10 : 0;
    }

    _findSum(stat) {
      let result = 0;

      this._allPlayers.forEach(member => {
        result += member[stat];
      });

      return result;
    }

    _processEvent(str) {
      if (str.payload) {
        const data = str.payload;
        const char_id = data.character_id;

        if (data.event_name === 'GainExperience') {
          const xpId = parseInt(data.experience_id);

          if (xpId === 1 || xpId === 29)
            this._addStat(char_id, 'kills');
          else if (xpId === 37)
            this._addStat(char_id, 'headshots');
          else if (xpId === 2 || (xpId >= 550 && xpId <= 555))
            this._addStat(char_id, 'assists');

          else if (xpId === 4 || xpId === 51)
            this._addStat(char_id, 'heals');
          else if (xpId === 7 || xpId === 53)
            this._addStat(char_id, 'revives');

          else if (xpId === 6 || xpId === 28 || xpId === 31 || xpId === 276 || xpId === 302 || xpId === 584 || (xpId >= 129 && xpId <= 142) || (xpId >= 88 && xpId <= 100))
            this._addStat(char_id, 'repairs');
          else if (xpId === 34 || xpId === 55)
            this._addStat(char_id, 'resupplies');
        }

        else if (data.event_name === 'Death')
          this._addStat(char_id, 'deaths');

        else if (data.event_name === 'PlayerFacilityCapture')
          this._addCapture(data.outfit_id);

        else if (data.event_name === 'PlayerFacilityDefend')
          this._addDefense();
      }
    }

    _generateTable() {
      const endDate = new Date().toLocaleString();

      const data = {
        players: this._allPlayers,
        mainStats: this._generateMainStats(),
        outfitName: this._outfitName,
        fileName: this._outputName,
        startDate: this._startDate,
        endDate: endDate
      };

      this._tableCreator.generateTable(data);
    }

    _generateMainStats() {
      return {
        topKiller: this._findBestKiller(),
        topHealer: this._findBestHealer(),
        topEngineer: this._findBestEngineer(),

        averageKdr: this._findAverageKdr(),
        averageHsr: this._findAverageHsr(),
        sumKills: this._findSum('kills'),

        captured: this._captured,
        defended: this._defended,
        capturedByOutfit: this._capturedByOutfit,

        longestKillstreak: this._longestKillstreak,
        longestDeathstreak: this._longestDeathstreak
      };
    }

    _findBestKiller() {
      const getScore = (kills, hsr, kdr, assists) => {
        return kills + kills * hsr / 100 + kills * (kdr / 10) + assists / 2;
      };

      return this._findBestPlayer(getScore, ['kills', 'hsr', 'kdr', 'assists']);
    }

    _findBestHealer() {
      const getScore = (kills, revives, heals) => {
        if (revives === 0 && heals === 0)
          return 0;

        return kills / 2 + revives + heals / 5;
      };

      return this._findBestPlayer(getScore, ['kills', 'revives', 'heals']);
    }

    _findBestEngineer() {
      const getScore = (kills, repairs, resupplies) => {
        if (repairs === 0 && resupplies === 0)
          return 0;

        return kills + repairs / 5 + resupplies / 10;
      };

      return this._findBestPlayer(getScore, ['kills', 'repairs', 'resupplies']);
    }

    _findBestPlayer(func, args) {
      let topScore = 0;
      let topPlayer = 'none';

      this._allPlayers.forEach(player => {
        const stats = args.map(x => player[x]);
        const score = func(...stats);

        if (score > topScore) {
          topScore = score;
          topPlayer = player.name;
        }
      });

      return topPlayer;
    }
  }
