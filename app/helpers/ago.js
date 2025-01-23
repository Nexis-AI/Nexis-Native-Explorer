import { helper } from '@ember/component/helper';
import { format } from 'timeago.js';

export function ago([value]) {
  return format(value * 1000);
}

export default helper(ago);
