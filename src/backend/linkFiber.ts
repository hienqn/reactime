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
  Snapshot,
  Mode,
  ComponentData,
  HookStates,
  Fiber,
} from './types/backendTypes';
import Tree from './tree';
import componentActionsRecord from './masterState';
import { throttle, getHooksNames } from './helpers';

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;
  }
}

let isRecoil = false;
let doWork = true;
const circularComponentTable = new Set();
let allAtomsRelationship = [];

function getRecoilState() : any {
  const RecoilSnapshotsLength = window[`$recoilDebugStates`].length;
  const lastRecoilSnapshot = window[`$recoilDebugStates`][RecoilSnapshotsLength - 1];
  const nodeToNodeSubs = lastRecoilSnapshot.nodeToNodeSubscriptions;
  let nodeToNodeSubsKeys = lastRecoilSnapshot.nodeToNodeSubscriptions.keys();
  nodeToNodeSubsKeys.forEach( 
    node => {
      nodeToNodeSubs.get(node).forEach(
        nodeSubs => allAtomsRelationship.push([node, nodeSubs, 'atoms and selectors'])
      )
    }
  )
}


export default (snap: Snapshot, mode: Mode): (() => void) => {
  let fiberRoot = null;

  function sendSnapshot(): void {
    // Don't send messages while jumping or while paused
    if (mode.jumping || mode.paused) return;

    if (!snap.tree) {
      snap.tree = new Tree('root', 'root');
    }

    const payload = snap.tree.cleanTreeCopy(); // snap.tree.getCopy();

    isRecoil ? getRecoilState() : ' ' ;
    
    // payload.recoilState = window[`$recoilDebugStates`];

    isRecoil ? payload.AtomsRelationship = allAtomsRelationship : ' ';
    
    window.postMessage(
      {
        action: 'recordSnap',
        payload,
      },
      '*'
    );
    allAtomsRelationship = [];
  }

  // Injects instrumentation to update our state tree every time
  // a hooks component changes state
  function traverseHooks(memoizedState: any): HookStates {
    const hooksStates: HookStates = [];
    while (memoizedState && memoizedState.queue) {
      if (
        memoizedState.memoizedState &&
        memoizedState.queue.lastRenderedReducer &&
        memoizedState.queue.lastRenderedReducer.name === 'basicStateReducer'
      ) {
        hooksStates.push({
          component: memoizedState.queue,
          state: memoizedState.memoizedState,
        });

      }
      memoizedState =
        memoizedState.next !== memoizedState ? memoizedState.next : null;
    }
    return hooksStates;
  }

  // This runs after every Fiber commit. It creates a new snapshot
  function createTree(
    currentFiber: Fiber,
    tree: Tree = new Tree('root', 'root'),
    fromSibling = false
  ) {
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
      memoizedProps,
      elementType,
      tag,
      actualDuration,
      actualStartTime,
      selfBaseDuration,
      treeBaseDuration,
    } = currentFiber;

    if (elementType?.name && isRecoil) {
      let pointer = memoizedState;
      while (pointer !== null && pointer !== undefined && pointer.next !== null ){
        pointer = pointer.next;
      }
      if (pointer?.memoizedState[1]?.[0].current) {
        let atomName = pointer.memoizedState[1]?.[0].current.keys().next().value;
        allAtomsRelationship.push([atomName, elementType?.name, 'atoms and components'])
      }

      if (pointer?.memoizedState[1]?.[0].key) {
        let atomName = pointer.memoizedState[1]?.[0].key;
        allAtomsRelationship.push([atomName, elementType?.name, 'atoms and components'])
      }
    }

    let newState: any | { hooksState?: any[] } = {};
    let componentData: {
      hooksState?: any[];
      hooksIndex?: number;
      index?: number;
      actualDuration?: number;
      actualStartTime?: number;
      selfBaseDuration?: number;
      treeBaseDuration?: number;
    } = {};
    let componentFound = false;

    // Check if node is a stateful setState component
    if (stateNode && stateNode.state && (tag === 0 || tag === 1 || tag === 2)) {
      // Save component's state and setState() function to our record for future
      // time-travel state changing. Add record index to snapshot so we can retrieve.
      componentData.index = componentActionsRecord.saveNew(
        stateNode.state,
        stateNode
      );
      newState = stateNode.state;
      componentFound = true;
    }

    let hooksIndex;

    if (window[`$recoilDebugStates`]) {
      isRecoil = true;
    }

    const atomArray = [];
    atomArray.push(memoizedProps);

    function traverseRecoilHooks(memoizedState: any): HookStates {
      const hooksStates: HookStates = [];
      while (memoizedState && memoizedState.queue) {
        if (
          memoizedState.memoizedState &&
          memoizedState.queue.lastRenderedReducer &&
          memoizedState.queue.lastRenderedReducer.name === 'basicStateReducer'
        ) {
          if (Object.entries(memoizedProps).length !== 0) {
            hooksStates.push({
              component: memoizedState.queue,
              state: memoizedProps,
            });
          }

        }
        memoizedState =
          memoizedState.next !== memoizedState ? memoizedState.next : null;
      }

      return hooksStates;
    }

    if (
      memoizedState &&
      (tag === 0 || tag === 1 || tag === 2 || tag === 10) &&
      isRecoil === true
    ) {
      if (memoizedState.queue) {
        // Hooks states are stored as a linked list using memoizedState.next,
        // so we must traverse through the list and get the states.
        // We then store them along with the corresponding memoizedState.queue,
        // which includes the dispatch() function we use to change their state.
        const hooksStates = traverseRecoilHooks(memoizedState);
        hooksStates.forEach((state, i) => {

          hooksIndex = componentActionsRecord.saveNew(
            state.state,
            state.component
          );
          componentData.hooksIndex = hooksIndex;
          if (newState && newState.hooksState) {
            newState.push(state.state);
          } else if (newState) {
            newState = [state.state];
          } else {
            newState.push(state.state);
          }
          componentFound = true;
        });
      }
    }

    // Check if node is a hooks useState function
    //REGULAR REACT HOOKS
    if (
      memoizedState &&
      (tag === 0 || tag === 1 || tag === 2 || tag === 10) &&
      isRecoil === false
    ) {
      if (memoizedState.queue) {

        // Hooks states are stored as a linked list using memoizedState.next,
        // so we must traverse through the list and get the states.
        // We then store them along with the corresponding memoizedState.queue,
        // which includes the dispatch() function we use to change their state.
        const hooksStates = traverseHooks(memoizedState);
        const hooksNames = getHooksNames(elementType.toString());
        hooksStates.forEach((state, i) => {
          hooksIndex = componentActionsRecord.saveNew(
            state.state,
            state.component
          );
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

    let newNode = null;
    // We want to add this fiber node to the snapshot
    if (componentFound || newState === 'stateless') {
      if (fromSibling) {
        newNode = tree.addSibling(
          newState,
          elementType ? elementType.name : 'nameless',
          componentData
        );
      } else {
        newNode = tree.addChild(
          newState,
          elementType ? elementType.name : 'nameless',
          componentData
        );
      }
    } else {
      newNode = tree;
    }

    // Recurse on children
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
    
    return tree;
  }

  function updateSnapShotTree(): void {
    if (fiberRoot) {
      const { current } = fiberRoot;
      circularComponentTable.clear();
      snap.tree = createTree(current);
      
    }
    sendSnapshot();
  }

  function onVisibilityChange(): void {
    doWork = !document.hidden;
  }

  return () => {

    const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const reactInstance = devTools ? devTools.renderers.get(1) : null;
    fiberRoot = devTools.getFiberRoots(1).values().next().value;

    const throttledUpdateSnapshot = throttle(updateSnapShotTree, 70);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (reactInstance && reactInstance.version) {
      devTools.onCommitFiberRoot = (function (original) {
        return function (...args) {
          // eslint-disable-next-line prefer-destructuring
          fiberRoot = args[1];
          if (doWork) {
            throttledUpdateSnapshot();
          }
          return original(...args);
        };
      })(devTools.onCommitFiberRoot);
    }
    throttledUpdateSnapshot();
  };
};
