import { helper } from '@ember/component/helper';

export function from_lamport([value]) {
  let result = (value / 1000000000).toFixed(9);
  result = Math.abs(result).toString().slice(0, 1) === '0' ? parseFloat(result) : parseInt(result, 10).toLocaleString();
  return result;
}

export default helper(from_lamport);
