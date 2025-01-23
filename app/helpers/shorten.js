import { helper } from '@ember/component/helper';

export function shorten([text]) {
  if(text === undefined) {
    return text;
  } else {
    return text.substr(0, 4) + '...' + text.substr(text.length - 4);
  }
}

export default helper(shorten);
