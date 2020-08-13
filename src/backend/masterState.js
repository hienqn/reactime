/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import 'core-js';
/* eslint-disable no-plusplus */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */

const componentActionsRecord = {};
let index = 0;

// module.exports = {
export default {
  saveNew: (state, component) => {
    componentActionsRecord[index] = { state, component };
    index++;
    // console.log(componentActionsRecord);
    return index - 1;
  },
  getRecordByIndex: inputIndex => componentActionsRecord[inputIndex],
  getComponentByIndex: inputIndex => (componentActionsRecord[inputIndex]
    ? componentActionsRecord[inputIndex].component
    : undefined),
};

/* const masterState = [];
const hooksComponentsActions = {};

module.exports = {
  saveState: state => {
    for (const key in state) {
      masterState.push(state[key]);
    }
    return masterState;
  },
  returnState: () => masterState,
  saveHooksComponent: stateAndAction => {
    for (const elementName in stateAndAction) {
      hooksComponentsActions[elementName] = stateAndAction[elementName];
    }
  },
};
 */
