import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class SearchComponent extends Component {
  @tracked search;
  @service router;
  @service notify;

  @action
  do_search() {
    const search = this.search.replaceAll(',', '');
    const length = search.length;
    const numeric = /^\d+$/;

    if (length >= 32 && length <= 44) {
      this.router.transitionTo('address', search);
    } else if (length >= 80) {
      this.router.transitionTo('transaction', search);
    } else if (length < 32 && numeric.test(parseInt(search))) {
      this.router.transitionTo('block', search);
    } else {
      this.notify.info('Unable to process this search.');
    }
  }
}
