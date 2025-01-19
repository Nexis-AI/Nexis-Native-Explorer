import Component from '@glimmer/component';

export default class LineChartComponent extends Component {
  point = { show: false };
  color = { pattern: ['#63b941'] };
  axis = {
    x: { show: false, tick: { format: '%Y-%m-%d %H:%M:%S' }, type: 'timeseries' },
    y: { show: false },
  };
  legend = { show: false };
  size = { height: 100 };
  tooltip = {
    contents: function (data, defaultTitleFormat, defaultValueFormat) {
      var $$ = this,
        config = $$.config,
        titleFormat = config.tooltip_format_title || defaultTitleFormat,
        valueFormat = config.tooltip_format_value || defaultValueFormat,
        text,
        i,
        title,
        value;

      for (i = 0; i < data.length; i++) {
        if (!(data[i] && (data[i].value || data[i].value === 0))) {
          continue;
        }

        if (!text) {
          title = titleFormat ? titleFormat(data[i].x) : data[i].x;
          text = "<div id='tooltip' class='d3-tip'>";
        }
        value = valueFormat(data[i].value, data[i].ratio, data[i].id, data[i].index);
        text += `<span class='title'>${title}</span>`;
        text += `<span class='value'>$${value.toFixed(3)}</span>`;
        text += `</div>`;
      }

      return text;
    },
  };
  get chart_data() {
    if (this.args.data) {
      const price = ['USD', ...this.args.data.map((p) => p.median_price)];
      const x = ['x', ...this.args.data.map((p) => new Date(Date.parse(p.timestamp)))];

      return {
        x: 'x',
        columns: [x, price],
        type: 'spline',
      };
    } else {
      return [];
    }
  }
  get grid() {
    if (this.args.data) {
      const lines = this.args.data.map((p) => {
        return { value: new Date(Date.parse(p.timestamp)) };
      });

      return {
        lines: {
          front: false,
        },
        x: {
          lines: lines,
        },
      };
    } else {
      return [];
    }
  }
}
