import EmberRouter from '@ember/routing/router';
import config from 'velasity/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('validators');
  this.route('block', { path: '/block/:block_id' });
  this.route('address', { path: '/address/:address_id' });
  this.route('transaction', { path: '/transaction/:transaction_id' });
  this.route('validator', { path: '/validator/:vote_key' });
});
