import Route from '@ember/routing/route';
import ENV from 'nexscan/config/environment';
import axios from 'axios';
import { inject as service } from '@ember/service';

export default class BlockRoute extends Route {
  @service notify;
  @service router;

  api_url = ENV.APP.api.search;

  model(params) {
    return this.loadData(params.block_id);
  }

  loadData(block_id) {
    return axios({ method: 'get', url: this.api_url, params: { type: 'block', search: block_id } })
      .then((response) => {
        if (response.data.error || response.data === '') {
          this.notify.info('Failed to find block.');
          this.router.transitionTo('index');
        }
        const result = response.data.result;
        result.blockId = parseInt(block_id);
        return result;
      })
      .catch(() => {
        return false;
      });
  }
}
