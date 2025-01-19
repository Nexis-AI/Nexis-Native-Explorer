import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ThemeSwitcherComponent extends Component {
  @action
  toggleTheme() {
    this.args.toggle();
  }
}
