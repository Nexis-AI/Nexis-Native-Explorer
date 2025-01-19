import Route from '@ember/routing/route';
import { cancel, later } from '@ember/runloop';
import ENV from 'velasity/config/environment';
import { inject as service } from '@ember/service';
import axios from 'axios';

export default class IndexRoute extends Route {
  @service notify;

  api_url = ENV.APP.api.stats;

  model() {
    this.poll();
    return this.loadData();
  }

  poll() {
    return later(async () => {
      this.refresh();
    }, 1000 * 10);
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

  deactivate() {
    cancel(this.poll);
  }
}
