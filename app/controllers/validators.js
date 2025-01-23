import Controller from '@ember/controller';
import { htmlSafe } from '@ember/template';
import ENV from 'velasity/config/environment';
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
    if (this.model.validators) {
      const count = this.model.validators.length;
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

      const cumulative_sum = ((sum) => (value) => (sum += value))(0);
      const cumulative_stake = validators.map((e) => e.activated_stake).map(cumulative_sum);
      const total_stake = validators.map((e) => e.activated_stake).reduce((acc, curr) => acc + curr);

      for (var j = 0; j < validators.length; j++) {
        // assign calculated properties
        validators[j].score = validator_scores[validators[j].vote_pubkey];
        validators[j].activated_stake_percent = Math.round((validators[j].activated_stake / total_stake) * 100);
        validators[j].cumulative_stake = cumulative_stake[j];
        validators[j].cumulative_stake_percent = Math.round((cumulative_stake[j] / total_stake) * 100);
        validators[j].activated_stake = validators[j].activated_stake.toLocaleString();
        validators[j].last_vote = validators[j].last_vote.toLocaleString();
        validators[j].cumulative_width = this.safe_width(validators[j].cumulative_stake_percent);
        validators[j].own_width_w_offset = this.safe_width_w_offset(
          validators[j].activated_stake_percent,
          Math.abs(validators[j].activated_stake_percent - validators[j].cumulative_stake_percent)
        );
        validators[j].halt_warning = false;
        validators[j].style = halt_warning_set ? this.safe_delay(j + 2) : this.safe_delay(j + 1);

        if (validators[j].skip_percent) {
          validators[j].skip_percent = validators[j].skip_percent.toFixed(2);
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
    if (this.model.inflation && this.model.validators) {
      const inflation = this.model.inflation.total;
      const total_supply = this.model.supply.total;
      const activated_stake = this.model.supply.activating + this.model.supply.effective;
      const apy = (inflation * total_supply) / activated_stake;
      const apy_adjusted = apy - inflation;

      return {
        apy: (apy * 100).toFixed(1),
        apy_adjusted: (apy_adjusted * 100).toFixed(1),
      };
    } else {
      return false;
    }
  }

  validator_scores() {
    if (this.model.validator_performance) {
      const performance = this.validator_performance();
      let output = [];

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

      return output;
    } else {
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
