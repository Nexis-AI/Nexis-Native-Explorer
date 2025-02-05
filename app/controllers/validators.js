import Controller from '@ember/controller';
import { htmlSafe } from '@ember/template';
import ENV from 'nexscan/config/environment';
import { StarFourPoints } from 'ember-mdi';

export default class ValidatorsController extends Controller {
  api_url = ENV.APP.api_url;
  vote_key = ENV.APP.vote_key;
  StarFourPoints = StarFourPoints;

  safe_width(width) {
    return htmlSafe(`width: ${width}%`);
  }

  safe_width_w_offset(width, offset) {
    return htmlSafe(`width: ${width}%; left: ${offset}%`);
  }

  safe_delay(value) {
    value = (value / 10).toFixed(2);
    return htmlSafe(`--delay: ${value}s;`);
  }

  get validators() {
    console.log("Validators Data:", this.model.validators);
    //console.log("Validators Model Data:", this.model.validators); // DEBUGGING
    if (this.model.validators) {
      const count = this.model.validators.length;
      //console.log("Total Validators Count:", count); // DEBUGGING
      const validator_scores = this.validator_scores();

      let validators = this.model.validators;
      let halt_warning_set = false;
      let count_halt;
      let versions = [];
      let top_two_versions = [];
      let other_versions = [];
      let other_versions_parent = {};

      for (var i = validators.length - 1; i >= 0; i--) {
        validators[i].activated_stake = Math.round(validators[i].activated_stake / 1000000000);
      }

      validators = validators.sort((a, b) => (a.activated_stake < b.activated_stake ? 1 : -1));

      const cumulative_sum = ((sum) => (value) => sum += value)(0);
      const cumulative_stake = validators.map((e, index) => {
          let stake = e.activated_stake || 0;
          if (index === 0) return stake;
          return cumulative_stake[index - 1] + stake;
      });
      
      const total_stake = validators.reduce((acc, curr) => {
        let stake = curr.activated_stake;
        if (typeof stake === "string") {
            stake = parseInt(stake.replace(/,/g, ""), 10);
        }
        return acc + (isNaN(stake) ? 0 : stake);
      }, 0);

      for (var j = 0; j < validators.length; j++) {
        // assign calculated properties
        validators[j].vote_pubkey = validators[j].vote_pubkey || validators[j].voteAccountPubkey || "N/A";
        validators[j].score = validator_scores[validators[j].vote_pubkey];

        if (typeof validators[j].activated_stake !== "number" || isNaN(validators[j].activated_stake)) {
          validators[j].activated_stake = 0;
        } else {
            validators[j].activated_stake = Math.round(validators[j].activated_stake / 1000000000);
        }
        validators[j].last_vote = validators[j].performance?.last_vote || validators[j].lastVote || "N/A";
        validators[j].activated_stake_percent = Math.round(((typeof validators[j].activated_stake === "string" ? parseInt(validators[j].activated_stake.replace(/,/g, ""), 10) : validators[j].activated_stake) / total_stake) * 100) || 0;
        validators[j].cumulative_stake = cumulative_stake[j] || 0;
        validators[j].cumulative_stake_percent = Math.round((cumulative_stake[j] / total_stake) * 100) || 0;
        validators[j].cumulative_width = this.safe_width(validators[j].cumulative_stake_percent);

        validators[j].own_width_w_offset = this.safe_width_w_offset(
          validators[j].activated_stake_percent,
          Math.abs(validators[j].activated_stake_percent - validators[j].cumulative_stake_percent)
        );
        validators[j].halt_warning = false;
        validators[j].style = halt_warning_set ? this.safe_delay(j + 2) : this.safe_delay(j + 1);

        if (typeof validators[j].skip_percent === "string") {
          validators[j].skip_percent = parseFloat(validators[j].skip_percent.replace("%", "")) / 100;
        } else if (typeof validators[j].skip_percent !== "number" || isNaN(validators[j].skip_percent)) {
            validators[j].skip_percent = 0;
        }

        // set halt warning
        if (validators[j].cumulative_stake_percent > 33 && !halt_warning_set) {
          count_halt = j + 1;
          validators[j].halt_warning = true;
          halt_warning_set = true;
        }

        const version = validators[j].version ? validators[j].version : 'other';

        // calculate node version stats
        if (version in versions) {
          versions[version].count++;
        } else {
          versions[version] = { version: version, count: 1 };
        }
      }

      versions = Object.values(versions).sort((a, b) => (a.count < b.count ? 1 : -1));
      other_versions_parent = versions.filter((o) => o.version === 'other')[0];
      top_two_versions = versions.filter((o) => o.version !== 'other').slice(0, 2);
      other_versions = versions.filter((o) => o.version !== 'other').slice(2);

      for (let i = 0; i < other_versions.length; i++) {
        other_versions_parent.count += other_versions[i].count;
      }

      versions = top_two_versions.concat(other_versions_parent);

      versions.forEach((v) => {
        v.percent = ((v.count / count) * 100).toFixed(1);
      });

      const delay_halt = this.safe_delay(count_halt + 1);

      return {
        count: count,
        count_halt: count_halt,
        delay_halt: delay_halt,
        list: validators,
        versions: versions,
      };
    } else {
      return false;
    }
  }

  get yield() {
    if (!this.model.supply || !this.model.supply.total || !this.model.supply.effective) {
        console.log("Staking APR: Missing supply data", this.model.supply);
        return { apy: "N/A", apy_adjusted: "N/A" };
    }

    const inflation = this.model.supply?.inflation?.total || 0;
    const total_supply = this.model.supply.total || 0;
    const activated_stake = this.model.supply.effective || 0;

    if (activated_stake === 0 || total_supply === 0) {
        console.log("Staking APR: Invalid values", { total_supply, activated_stake });
        return { apy: "N/A", apy_adjusted: "N/A" };
    }

    const apy = (inflation * total_supply) / activated_stake;
    const apy_adjusted = apy - inflation;

    console.log("Staking APR Calculated:", { apy, apy_adjusted });

    return {
        apy: (apy).toFixed(2),
        apy_adjusted: (apy_adjusted).toFixed(2)
    };
  }

  validator_scores() {
    if (this.model.validator_performance) {
      const performance = this.validator_performance();
      let output = [];
      console.log("Validator Performance:", performance);

      for (const [key, value] of Object.entries(performance)) {
        const cluster_median_vote_distance = value.reduce((acc, curr) => acc + parseInt(curr.cluster_median_vote_distance), 0);
        const median_vote_distance = value.reduce((acc, curr) => acc + parseInt(curr.median_vote_distance), 0);
        const cluster_average_vote_distance = value.reduce((acc, curr) => acc + parseInt(curr.cluster_average_vote_distance), 0);
        const average_vote_distance = value.reduce((acc, curr) => acc + parseInt(curr.average_vote_distance), 0);
        const cluster_median_vote = cluster_median_vote_distance >= median_vote_distance;
        const cluster_average_vote = cluster_average_vote_distance >= average_vote_distance;
        const vote_score = cluster_median_vote ? 2 : cluster_average_vote ? 1 : 0;

        const cluster_median_root_distance = value.reduce((acc, curr) => acc + parseInt(curr.cluster_median_root_distance), 0);
        const median_root_distance = value.reduce((acc, curr) => acc + parseInt(curr.median_root_distance), 0);
        const cluster_average_root_distance = value.reduce((acc, curr) => acc + parseInt(curr.cluster_average_root_distance), 0);
        const average_root_distance = value.reduce((acc, curr) => acc + parseInt(curr.average_root_distance), 0);
        const cluster_median_root = cluster_median_root_distance >= median_root_distance;
        const cluster_average_root = cluster_average_root_distance >= average_root_distance;
        const root_score = cluster_median_root ? 2 : cluster_average_root ? 1 : 0;

        const cluster_median_skip_rate = value.reduce((acc, curr) => acc + parseInt(curr.cluster_median_skip_rate), 0);
        const median_skip_rate = value.reduce((acc, curr) => acc + parseInt(curr.median_skip_rate), 0);
        const cluster_average_skip_rate = value.reduce((acc, curr) => acc + parseInt(curr.cluster_average_skip_rate), 0);
        const average_skip_rate = value.reduce((acc, curr) => acc + parseInt(curr.average_skip_rate), 0);
        const cluster_median_skip = cluster_median_skip_rate >= median_skip_rate;
        const cluster_average_skip = cluster_average_skip_rate >= average_skip_rate;
        const skip_score = cluster_median_skip ? 2 : cluster_average_skip ? 1 : 0;

        const total_score = (vote_score * 2.5 + root_score * 2.5 + skip_score * 2.5) / 3;

        output[key] = {
          vote: vote_score,
          root: root_score,
          skip: skip_score,
          total: total_score,
        };
      }
      console.log("Final Scores:", output); // Debugging line
      return output;
    } else {
      console.log("No validator performance data found"); // Debugging line
      return false;
    }
  }

  validator_performance() {
    if (this.model.validator_performance) {
      let output = [];

      for (let i = 0; i < this.model.validator_performance.length; i++) {
        const row = this.model.validator_performance[i];
        const key = row.voteAccountPubkey;

        if (key in output) {
          output[key].push(row);
        } else {
          output[key] = [];
          output[key].push(row);
        }
      }

      output.map((o) => {
        o.sort(function (a, b) {
          return a.timestamp - b.timestamp;
        });
      });

      return output;
    } else {
      return false;
    }
  }
}
