'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    sassOptions: {
      extension: 'sass',
    },
    'ember-bootstrap': {
      bootstrapVersion: 4,
      importBootstrapCSS: false,
      whitelist: ['bs-tooltip'],
    },
    'ember-cli-page-progress': {
      includeCss: false,
    },
    'ember-composable-helpers': {
      only: ['object-at'],
    },
    'ember-mdi': {
      icons: ['heart', 'star', 'star-four-points', 'content-copy', 'information', 'twitter'],
    },
  });

  return app.toTree();
};
