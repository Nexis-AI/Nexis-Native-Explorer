import Route from '@ember/routing/route';
import ENV from 'nexscan/config/environment';
import { inject as service } from '@ember/service';
import axios from 'axios';

export default class ValidatorsRoute extends Route {
  @service notify;

  api_url = ENV.APP.api.stats;

  model() {
    return this.loadData();
  }

  loadData() {
    return axios({ method: 'get', url: this.api_url })
      .then((response) => {
        if (response.data.error || response.data === '') {
          this.notify.info('Failed to load data.');
        }
        return response.data;
      })
      .catch(() => {
        return false;
      });
  }
}
