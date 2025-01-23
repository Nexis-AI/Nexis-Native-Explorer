import Route from '@ember/routing/route';
import { action } from '@ember/object';
import copy from 'copy-to-clipboard';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service notify;

  @action
  async loading(transition) {
    if (!transition.from || transition.from.name !== transition.to.name) {
      document.querySelector('#loading').classList.remove('done');
      transition.promise.finally(() => {
        document.querySelector('#loading').classList.add('done');
      });
    } else {
      transition.promise.finally(() => {});
    }
    return true;
  }

  @action
  copy(key) {
    copy(key);
    this.notify.info('Copied to clipboard.');
  }
}
