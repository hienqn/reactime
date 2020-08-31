/* eslint-disable linebreak-style */
/* eslint-disable no-shadow */
/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable linebreak-style */
/* eslint-disable no-inner-declarations, no-loop-func */
// eslint-disable-next-line import/newline-after-import
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const JSXParser = acorn.Parser.extend(jsx());
/**
 * @method throttle
 * @param f A function to throttle
 * @param t A number of milliseconds to use as throttling interval
 * @returns A function that limits input function, `f`, from being called more than once every `t` milliseconds
 * 
 * 
 */
export const throttle = (f: Function, t: number): Function => {
  // isOnCooldown is true when the main stack is free
  let isOnCooldown: boolean = false;
  // isCallQueued is true then there is an other function 
  // to be executed when the cool down period is over. 
  let isCallQueued: boolean = false;

  // Throttling the passed-in function using the 2 variables above.
  const throttledFunc = (): any => {
    // if it is on the cool down, there is already a function ready to be fire in the 
    // event queue, then return nothing.
    if (isOnCooldown && isCallQueued) return;

    // If it is on cool down, but this the first time we have attempted to execute this function
    // again, then set isCallQueeued = true
    if (isOnCooldown) {
      isCallQueued = true;
      return;
    }

    // if we're not on cool down, execute the function immediately and 
    // set new cool down period by setting the next two variable as follow.

    f();
    isOnCooldown = true;
    isCallQueued = false;

    // set a function to check whether we have 
    // another function to be executed right after. 
    const runAfterTimeout = (): any => {
      if (isCallQueued) {
        isCallQueued = false;
        isOnCooldown = true; // not needed I think
        f();
        setTimeout(runAfterTimeout, t);
        return;
      }
      isOnCooldown = false;
    };

    setTimeout(runAfterTimeout, t);
  };

  return throttledFunc;
};

// Helper function to grab the getters/setters from `elementType`
/**
 * @method getHooksNames
 * @param elementType The fiber `type`, A stringified function of the component the Fiber whose hooks we want corresponds to
 * @returns An array of strings 
 */
export const getHooksNames = (elementType: string): Array<string> => {
  // Initialize empty object to store the setters and getter
  let ast: any;
  try {
    ast = JSXParser.parse(elementType);
  } catch (e) {
    return ['unknown'];
  }

  const hooksNames: any = {};

  //Only run if the ast has a body property.
  while (Object.hasOwnProperty.call(ast, 'body')) {
    let tsCount: number = 0; // Counter for the number of TypeScript hooks seen (to distinguish in masterState)
    ast = ast.body;

    // Statements get all the names of the hooks. For example: useCount, useWildcard, ...
    const statements: Array<string> = [];
    /** All module exports always start off as a single 'FunctionDeclaration' type
     * Other types: "BlockStatement" / "ExpressionStatement" / "ReturnStatement"
     * Iterate through AST of every function declaration
     * Check within each function declaration if there are hook declarations */
    ast.forEach((functionDec) => {
      let body: any;
      if (functionDec.expression && functionDec.expression.body)
        body = functionDec.expression.body.body;
      else body = functionDec.body ? functionDec.body.body : [];
      // Traverse through the function's funcDecs and Expression Statements
      body.forEach((elem: any) => {
        // Hooks will always be contained in a variable declaration
        if (elem.type === 'VariableDeclaration') {
          elem.declarations.forEach((hook: any) => {
            // Parse destructured statements pair
            if (hook.id.type === 'ArrayPattern') {
              hook.id.elements.forEach((hook) => {
                statements.push(`_useWildcard${tsCount}`);
                statements.push(hook.name);
                tsCount += 1;
              });
            // Process hook function invocation ?
            } else {
              if (hook.init.object && hook.init.object.name) {
                const varName: any = hook.init.object.name;
                if (!hooksNames[varName] && varName.match(/_use/)) {
                  hooksNames[varName] = hook.id.name;
                }
              }
              if (hook.id.name !== undefined) {
                statements.push(hook.id.name);
              }
            }
          });
        }
      });
      statements.forEach((el, i) => {
        if (el.match(/_use/)) hooksNames[el] = statements[i + 1];
      });
    });
  }
  return Object.values(hooksNames);
};
