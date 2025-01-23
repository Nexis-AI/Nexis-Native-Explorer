import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';

export function delay([value]) {
  value = (value / 10).toFixed(2);
  return htmlSafe(`--delay: ${value}s;`);
}

export default helper(delay);
