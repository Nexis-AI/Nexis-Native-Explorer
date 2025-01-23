import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import copy from 'copy-to-clipboard';
import { ContentCopy } from 'ember-mdi';

export default class CopyButtonComponent extends Component {
  @tracked hash;
  @tracked short = false;
  @service notify;
  ContentCopy = ContentCopy;

  @action
  copy(hash) {
    copy(hash);
    this.notify.info('Copied to clipboard.');
  }
}
