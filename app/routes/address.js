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
        console.log("Address API Response:", response.data); // DEBUGGING

        if (response.data.error || response.data === '') {
          this.notify.info('Failed to find address.');
          this.router.transitionTo('index');
          return false;
        }

        const result = response.data.result?.value || {};
        console.log("Extracted Account Data:", result); // DEBUGGING

        // Ensure missing fields are properly handled
        return {
          addressId: address_id,
          data: result.data || [],
          executable: result.executable ?? false,
          owner: result.owner || "N/A",
          lamports: result.lamports ?? 0,
          rentEpoch: result.rentEpoch ?? "N/A"
        };
      })
      .catch((error) => {
        console.error("Address API Fetch Error:", error); // DEBUGGING
        return false;
      });
  }
}
