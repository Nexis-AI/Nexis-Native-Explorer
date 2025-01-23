import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { Star } from 'ember-mdi';

export default class StarRatingComponent extends Component {
  Star = Star;
  
  get safe_width() {
    const width = (this.args.score / 5) * 100;
    return htmlSafe(`width: ${width}%`);
  }
}
