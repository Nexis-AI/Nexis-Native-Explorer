import Controller from '@ember/controller';
import { htmlSafe } from '@ember/template';
import { tracked } from '@glimmer/tracking';

const precision = 1000000000;
const billion = 1000000000;
const million = 1000000;

export default class IndexController extends Controller {
  @tracked seconds_remaining = false;
  @tracked countdown = false;

  init() {
    super.init(...arguments);

    setInterval(() => {
      if(this.seconds_remaining){
        this.seconds_remaining = this.seconds_remaining - 1;
      } else {
        this.seconds_remaining = this.epoch_seconds_remaining();
      }

      this.countdown = this.to_time(this.seconds_remaining);
    }, 1000);
  }

  safe_width(width) {
    return htmlSafe(`width: ${width}%`);
  }

  to_time(seconds) {
    const h = `${Math.floor(seconds / 3600)}`.padStart(2, '0');
    const m = `${Math.floor(seconds % 3600 / 60)}`.padStart(2, '0');
    const s = `${Math.floor(seconds % 3600 % 60)}`.padStart(2, '0');
    return `${h}:${m}:${s}`; 
  }

  get tps_range() {
    if (this.model.performance_history) {
      const min = this.model.performance_history.reduce((prev, current) => {
        return prev.numTransactions < current.numTransactions ? prev : current;
      });
      const max = this.model.performance_history.reduce((prev, current) => {
        return prev.numTransactions > current.numTransactions ? prev : current;
      });
      return {
        min: Math.round(min.numTransactions / min.samplePeriodSecs),
        max: Math.round(max.numTransactions / max.samplePeriodSecs),
      };
    } else {
      return false;
    }
  }

  get current_tps() {
    if (this.model.performance_history) {
      const current = this.model.performance_history.reduce((prev, current) => {
        return prev.slot > current.slot ? prev : current;
      });
      return {
        tps: Math.round(current.numTransactions / current.samplePeriodSecs),
        slot: current.slot.toLocaleString(),
      };
    } else {
      return false;
    }
  }

  get current_num_txs() {
    if (this.model.performance_history) {
      const current = this.model.performance_history.reduce((prev, current) => {
        return prev.slot > current.slot ? prev : current;
      });

      return {
        num: current.numTransactions.toLocaleString(),
        slot: current.slot.toLocaleString(),
      };
    } else {
      return false;
    }
  }

  get transactions() {
    if (this.model.epoch) {
      const count = this.model.performance_history.length;
      const total_txs = this.model.performance_history.map((e) => e.numTransactions).reduce((a, b) => a + b);
      return {
        full: this.model.epoch.transactionCount.toLocaleString(),
        compact: (this.model.epoch.transactionCount / million).toFixed(1) + 'M',
        average: Math.round(total_txs / (count * 60)).toLocaleString(),
      };
    } else {
      return false;
    }
  }
  /*
  get rank() {
    if (this.model.epoch) {
      return this.model.price.cmc_rank;
    } else {
      return false;
    }
  }
  */

  get circulating_percent() {
    if (this.circulating_supply) {
      return ((this.circulating_supply / this.total_supply) * 100).toFixed(0);
    } else {
      return false;
    }
  }

  get staked_percent() {
    if (this.model.epoch) {
      const active_stake = this.model.validators.map((v) => Math.round(v.activated_stake / precision)).reduce((acc, curr) => acc + curr);
      return ((active_stake / this.model.supply?.total) * 100).toFixed(1);
    } else {
      return false;
    }
  }

  get total_supply() {
    if (this.model.epoch) {
      return (Math.round(this.model.supply?.total) / billion).toFixed(2);
    } else {
      return false;
    }
  }

  get circulating_supply() {
    if (this.model.epoch) {
      return (Math.round(this.model.supply?.circulating) / billion).toFixed(2);
    } else {
      return false;
    }
  }

  get active_stake() {
    if (this.model.epoch) {
      return (this.model.supply.effective / billion).toFixed(2);
    } else {
      return false;
    }
  }

  get price() {
    if (this.model.epoch) {
      return parseFloat(this.model.price?.price).toFixed(3);
    } else {
      return false;
    }
  }

  get volume_24h() {
    if (this.model.epoch) {
      return {
        full: Math.round(this.model.price?.volume_24h).toLocaleString(),
        compact: (this.model.price?.volume_24h / million).toFixed(1) + 'M',
      };
    } else {
      return false;
    }
  }

  get market_cap() {
    if (this.model.epoch) {
      return {
        full: Math.round(this.model.price?.market_cap).toLocaleString(),
        compact: (this.model.price?.market_cap / million).toFixed(1) + 'M',
      };
    } else {
      return false;
    }
  }

  get slot_height() {
    return this.model.epoch?.absoluteSlot.toLocaleString() || false;
  }

  get block_height() {
    return this.model.epoch?.blockHeight.toLocaleString() || false;
  }

  get epoch_progress() {
    if (this.model.epoch) {
      return this.safe_width(Math.round((this.model.epoch.slotIndex / this.model.epoch.slotsInEpoch) * 100));
    } else {
      return false;
    }
  }

  epoch_seconds_remaining() {
    if (this.model?.epoch) {
      return Math.round((this.model.epoch.slotsInEpoch - this.model.epoch.slotIndex) * this.slot_time);
    } else {
      return false;
    }
  }

  get epoch_number() {
    return this.model.epoch?.epoch || false;
  }

  get slot_time() {
    if (this.model.performance_history) {
      const count = this.model.performance_history.length;

      return (
        this.model.performance_history
          .filter((e) => e.numSlots !== 0)
          .map((e) => e.samplePeriodSecs / e.numSlots)
          .reduce((acc, curr) => acc + curr) / count
      ).toFixed(2);
    } else {
      return false;
    }
  }
}
