import Route from '@ember/routing/route';
import ENV from 'nexscan/config/environment';
import axios from 'axios';

export default class AddressRoute extends Route {
  api_url = ENV.APP.api.search;

  model(params) {
    return this.loadData(params.address_id);
  }

  loadData(address_id) {
    return axios({ method: 'get', url: this.api_url, params: { type: 'address', search: address_id } })
      .then((response) => {
        if (response.data.error || response.data === '') {
          this.notify.info('Failed to find address.');
          this.router.transitionTo('index');
        }
        const result = response.data.result.value;
        result.addressId = address_id;
        return result;
      })
      .catch(() => {
        return false;
      });
  }
}
