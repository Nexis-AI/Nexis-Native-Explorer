import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class AgoComponent extends Component {
  @tracked timestamp;

  get date() {
    return new Date(this.args.timestamp * 1000);
  }
}
