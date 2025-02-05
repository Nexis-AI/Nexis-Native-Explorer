import Route from '@ember/routing/route';
import ENV from 'nexscan/config/environment';
import axios from 'axios';
import { inject as service } from '@ember/service';

export default class ValidatorRoute extends Route {
  @service notify;
  @service router;

  api_url = ENV.APP.api.search;

  model(params) {
    return this.loadData(params.vote_key);
  }

  loadData(vote_key) {
    return axios({ method: 'get', url: this.api_url, params: { type: 'validator', search: vote_key } })
      .then((response) => {
        if (response.data.error || response.data === '') {
          this.notify.info('Failed to find validator.');
          this.router.transitionTo('index');
        }

        const result = response.data.result || {}; // Ensure result exists
        return {
          activated_stake: result.activated_stake || 0,
          commission: result.commission || 0,
          identity: result.identity || "N/A",
          last_vote: result.last_vote || "N/A",
          root_slot: result.root_slot || "N/A",
          vote_key: result.vote_key || "N/A",
          performance: result.performance || {},
          skip_percent: result.skip_percent || 0
        };
      })
      .catch((error) => {
        console.error("Validator Fetch Error:", error);
        return false;
      });
  }

}
