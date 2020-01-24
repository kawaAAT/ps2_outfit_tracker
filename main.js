
class Planetside2Tracker {
  constructor() {
    this._request = require("sync-request");
    this._readline = require('readline');

    const OutfitTracker = require('./outfit-tracker');
    this._outfitTracker = new OutfitTracker();
  }

  run() {
    const rl = this._readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter outfit tag: ', input => {
      if (this._checkTag(input)) {
        this._outfitTracker.run(input);

        rl.question('Press enter to stop!\n', input => {
          this._outfitTracker.stop();
          rl.close();
        });
      }
      else {
        console.log('Wrong outfit tag!\n');
        rl.close();

        this.run();
      }
    });
  }

  _checkTag(tag) {
    const res = this._request('GET', `https://census.daybreakgames.com/get/ps2:v2/outfit/?alias=${tag}`);

    try {
      const isOutfit = JSON.parse(res.getBody()).outfit_list.length === 1;
      return isOutfit;
    }
    catch (x) {
      console.log('Unknown error occured, try again!');
      return false;
    }
  }
}

const app = new Planetside2Tracker();
app.run();