import Route from '@ember/routing/route';
import ENV from 'velasity/config/environment';
import axios from 'axios';

export default class TransactionRoute extends Route {
  api_url = ENV.APP.api.search;

  model(params) {
    return this.loadData(params.transaction_id);
  }

  loadData(transaction_id) {
    return axios({ method: 'get', url: this.api_url, params: { type: 'transaction', search: transaction_id } })
      .then((response) => {
        if (response.data.error || response.data === '') {
          this.notify.info('Failed to find transaction.');
          this.router.transitionTo('index');
        }
        return response.data.result;
      })
      .catch(() => {
        return false;
      });
  }
}
