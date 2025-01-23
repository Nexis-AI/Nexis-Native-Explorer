import Route from '@ember/routing/route';
import ENV from 'velasity/config/environment';
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

        return response.data;
      })
      .catch(() => {
        return false;
      });
  }
}
