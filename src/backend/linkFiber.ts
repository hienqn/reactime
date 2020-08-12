/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
import 'core-js';
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable comma-dangle */
/**
 * This file contains core module functionality.
 *
 * It exports an anonymous function that is invoked on
 * @param snap --> Current snapshot
 * @param mode --> Current mode (jumping i.e. time-traveling, locked, or paused)
 * and @returns a function to be invoked by index.js to initiate snapshot monitoring
 *
 * @function updateSnapShotTree
 * --> Middleware #1: Updates snap object with latest snapshot
 *
 * @function sendSnapshot
 * --> Middleware #2: Gets a copy of the current snap.tree and posts a message to the window
 *
 * @function traverseHooks
 * @param memoizedState : memoizedState property on a stateful fctnl component's FiberNode object
 * --> Helper function to traverse through memoizedState
 * --> Invokes @changeUseState on each stateful functional component
 *
 * @function createTree
 * @param currentFiber : a FiberNode object
 * --> Recursive function to traverse from FiberRootNode and create
 *     an instance of custom Tree class and build up state snapshot
 */

/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */

// const Tree = require('./tree').default;
// const componentActionsRecord = require('./masterState');

import {
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 Snapshot, Mode, ComponentData, HookStates, Fiber
} from './types/backendTypes';
import Tree from './tree';
import componentActionsRecord from './masterState';
import { throttle, getHooksNames } from './helpers';


declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;
  }
}

let doWork = true;
const circularComponentTable = new Set();

// module.exports = (snap, mode) => {
export default (snap: Snapshot, mode: Mode): () => void => {
  let fiberRoot = null;

  function sendSnapshot(): void {
    // Don't send messages while jumping or while paused
    if (mode.jumping || mode.paused) return;

    if (!snap.tree) {
      snap.tree = new Tree('root', 'root');
    }
    const payload = snap.tree.cleanTreeCopy();// snap.tree.getCopy();

    // console.log('snap tree', snap.tree);
    // console.log('payload', payload);
    window.postMessage({
      action: 'recordSnap',
      payload,
    }, '*');
  }

  // Injects instrumentation to update our state tree every time
  // a hooks component changes state
  function traverseHooks(memoizedState: any): HookStates {
    const hooksStates: HookStates = [];
    while (memoizedState && memoizedState.queue) {
      if (memoizedState.memoizedState && memoizedState.queue.lastRenderedReducer && memoizedState.queue.lastRenderedReducer.name === 'basicStateReducer') {
        hooksStates.push({
          component: memoizedState.queue,
          state: memoizedState.memoizedState,
        });
      }
      memoizedState = memoizedState.next !== memoizedState
        ? memoizedState.next : null;
    }
    return hooksStates;
  }

  // This runs after every Fiber commit. It creates a new snapshot
  function createTree(currentFiber: Fiber, tree: Tree = new Tree('root', 'root'), fromSibling = false) {
    // Base case: child or sibling pointed to null
    if (!currentFiber) return null;
    if (!tree) return tree;

    // These have the newest state. We update state and then
    // called updateSnapshotTree()
    const {
      sibling,
      stateNode,
      child,
      memoizedState,
      elementType,
      tag,
      actualDuration,
      actualStartTime,
      selfBaseDuration,
      treeBaseDuration,
    } = currentFiber;
    // console.log('current Fiber each time', currentFiber);
    // console.log('current state Node of all current fiber', stateNode);

    let newState: any | {hooksState?: any[]} = {};
    let componentData: {
      hooksState?: any[],
      hooksIndex?: number,
      index?: number,
      actualDuration?: number,
      actualStartTime?: number,
      selfBaseDuration?: number,
      treeBaseDuration?: number} = {};
    let componentFound = false;

    // Check if node is a stateful setState component
    if (stateNode && stateNode.state && (tag === 0 || tag === 1 || tag === 2)) {
      // Save component's state and setState() function to our record for future
      // time-travel state changing. Add record index to snapshot so we can retrieve.
      componentData.index = componentActionsRecord.saveNew(stateNode.state, stateNode);
      newState = stateNode.state;
      componentFound = true;
    }

    // Check if node is a hooks useState function
    let hooksIndex;
    // console.log('here is memoized state and tag in createTree', memoizedState, tag);
    if (memoizedState && (tag === 0 || tag === 1 || tag === 2 || tag === 10)) {
      if (memoizedState.queue) {
        // Hooks states are stored as a linked list using memoizedState.next,
        // so we must traverse through the list and get the states.
        // We then store them along with the corresponding memoizedState.queue,
        // which includes the dispatch() function we use to change their state.
        const hooksStates = traverseHooks(memoizedState);
        console.log('hookStates', hooksStates);
        // debugger
        const hooksNames = getHooksNames(elementType.toString());
        console.log('hooknames', hooksNames);
        // console.log('get hook name', hooksNames);
        hooksStates.forEach((state, i) => {
          console.log('component action Record', componentActionsRecord);
          hooksIndex = componentActionsRecord.saveNew(state.state, state.component);
          componentData.hooksIndex = hooksIndex;
          if (newState && newState.hooksState) {
            newState.hooksState.push({ [hooksNames[i]]: state.state });
          } else if (newState) {
            newState.hooksState = [{ [hooksNames[i]]: state.state }];
          } else {
            newState = { hooksState: [] };
            newState.hooksState.push({ [hooksNames[i]]: state.state });
          }
          componentFound = true;
        });
      }
    }

    // This grabs stateless components
    // console.log('check if component Found is true', componentFound);
    if (!componentFound && (tag === 0 || tag === 1 || tag === 2)) {
      newState = 'stateless';
    }

    // Adds performance metrics to the component data
    componentData = {
      ...componentData,
      actualDuration,
      actualStartTime,
      selfBaseDuration,
      treeBaseDuration,
    };

    // console.log('componentData', componentData);

    let newNode = null;
    // We want to add this fiber node to the snapshot
    // console.log(currentFiber);
    // console.log('adding this fiber node to snapshot', componentFound, newState);
    if (componentFound || newState === 'stateless') {
      if (fromSibling) {
        newNode = tree.addSibling(newState,
          elementType ? elementType.name : 'nameless',
          componentData);
      } else {
        newNode = tree.addChild(newState,
          elementType ? elementType.name : 'nameless',
          componentData);
      }
    } else {
      newNode = tree;
    }
    
    // debugger
    // console.log('child', child);
    // console.log('sibling', sibling);
    // console.log(circularComponentTable);
    // console.log('------');
    // Recurse on children
    // debugger;
    if (child && !circularComponentTable.has(child)) {
      // If this node had state we appended to the children array,
      // so attach children to the newly appended child.
      // Otherwise, attach children to this same node.
      circularComponentTable.add(child);
      createTree(child, newNode);
    }
    // Recurse on siblings
    if (sibling && !circularComponentTable.has(sibling)) {
      circularComponentTable.add(sibling);
      createTree(sibling, newNode, true);
    }

    // console.log('this is a tree', tree);
    return tree;
  }

  
  function updateSnapShotTree(): void {
    if (fiberRoot) {
      console.log('do have fiber root');
      const { current } = fiberRoot;
      console.log(current);
      console.log('before chearling circularComponentTable', circularComponentTable);
      circularComponentTable.clear();
      console.log('check circularComponentTable', circularComponentTable);
      console.log('creating a tre....')
      snap.tree = createTree(current);
      console.log('after creating a tree, snap is', snap);
    }
    sendSnapshot();
  }

  function onVisibilityChange(): void {
    doWork = !document.hidden;
  }

  return () => {
/*     const container = document.getElementById('root');
    if (container._internalRoot) {
      fiberRoot = container._internalRoot;
    } else {
      const {
        _reactRootContainer: { _internalRoot },
        _reactRootContainer,
      } = container;
      // Only assign internal root if it actually exists
      fiberRoot = _internalRoot || _reactRootContainer;
    }
 */
    const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    // console.log('here is devTools', devTools);
    const reactInstance = devTools ? devTools.renderers.get(1) : null;
    fiberRoot = devTools.getFiberRoots(1).values().next().value;
    // let recoilRoot = fiberRoot.current.child;
    // console.log('get recoil root', recoilRoot);
    // console.log('get hook anme', getHooksNames(recoilRoot.elementType));
    // console.log('here is recoil debug states', window[`$recoilDebugStates`]);
    // console.log('get Batcher', recoilRoot.elementType(1));
    const throttledUpdateSnapshot = throttle(updateSnapShotTree, 70); // why 70ms?
    document.addEventListener('visibilitychange', onVisibilityChange); // what is this? if the user 
    // how did u stop?

    if (window[`$recoilDebugStates`] === undefined){
      console.log('this is not a recoil app');
    } else {
      console.log('this is a recoil app');
    }
    // console.log('reactInstance ha', reactInstance);
    if (reactInstance && reactInstance.version) {
      devTools.onCommitFiberRoot = (function (original) {
        // console.log('I am fiberroot', fiberRoot);
        return function (...args) {
          // eslint-disable-next-line prefer-destructuring
          fiberRoot = args[1];
          if (doWork) {
            // console.log('enter doWork');
            throttledUpdateSnapshot();
          }
          return original(...args);
        };
      }(devTools.onCommitFiberRoot));      
    }
    console.log('about to throttle and update snapshot')
    throttledUpdateSnapshot();
  };
};
