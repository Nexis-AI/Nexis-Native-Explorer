import Controller from '@ember/controller';
import ENV from 'velasity/config/environment';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { Twitter } from 'ember-mdi';

export default class ApplicationController extends Controller {
  @tracked theme;
  vote_key = ENV.APP.vote_key;
  Twitter = Twitter;

  constructor() {
    super(...arguments);

    if (localStorage.getItem('theme') === null) {
      localStorage.setItem('theme', 'dark');
      this.theme = 'dark';
    } else {
      this.theme = localStorage.getItem('theme');
    }

    document.body.classList.add(this.theme);
  }

  get theme() {
    return localStorage.getItem('theme');
  }

  didInsertElement() {
    document.querySelector('#loading').classList.add('done');
  }

  @action
  toggleTheme() {
    if (this.theme === 'dark') {
      localStorage.setItem('theme', 'light');
      this.theme = 'light';
      document.body.classList.remove('dark');
    } else {
      localStorage.setItem('theme', 'dark');
      this.theme = 'dark';
      document.body.classList.remove('light');
    }

    document.body.classList.add(this.theme);
  }
}
