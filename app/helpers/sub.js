import { helper } from '@ember/component/helper';

export function sub(params) {
  return params.reduce((a, b) => {
    return a - b;
  });
}

export default helper(sub);
