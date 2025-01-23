import Component from '@glimmer/component';
import c3 from 'c3';

export default class BarChartComponent extends Component {
  bar = { width: { ratio: 0.5 } };
  point = { show: false };
  color = { pattern: ['#e49f1d'] };
  axis = {
    x: { show: false },
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
        text += `<span class='value'>${value}</span>`;
        text += `</div>`;
      }

      return text;
    },
  };
  get chart_data() {
    if (this.args.data) {
      let performance = this.get_average(this.args.data);

      return {
        columns: [performance],
        type: 'bar',
      };
    } else {
      return [];
    }
  }
  get grid() {
    if (this.args.data) {
      const lines = this.get_average(this.args.data).map((e, i) => {
        return { value: i };
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
  array_chunk(array, chunk_size) {
    return Array(Math.ceil(array.length / chunk_size))
      .fill()
      .map((_, index) => index * chunk_size)
      .map((begin) => array.slice(begin, begin + chunk_size));
  }

  get_average(data) {
    let performance = data.sort((a, b) => (a.slot < b.slot ? 1 : -1));
    let chunked = this.array_chunk(performance, 3);
    return [
      'TPS',
      ...chunked.map((p) => {
        const total_txs = p.map((e) => e.numTransactions).reduce((a, b) => a + b);
        const total_secs = p.map((e) => e.samplePeriodSecs).reduce((a, b) => a + b);
        return Math.round(total_txs / total_secs);
      }),
    ];
  }
}
